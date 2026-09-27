"""Forecast orchestration.

One request from the UI becomes: read features from the database through ETL,
call the ML service with rows projected onto its schema, persist the run and
its predictions back to the database, then aggregate for the requested view.
Repeating the same query reuses the stored run instead of calling the model.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date as Date, datetime, timedelta
from typing import Any

from app.config import settings
from app.core.exceptions import ValidationException
from app.services.etl_client import ETLClient
from app.services.ml_client import MLClient

logger = logging.getLogger("backend")

HORIZONS = ("day", "month", "year")
# Database columns that may constrain the forecast window but are never sent to the model.
FILTER_FIELDS = (
    "day_type", "precip_type", "weather_condition", "split", "day_of_week", "month",
    "is_holiday", "is_dayoff", "temp_min", "temp_max", "precipitation_max",
    "wind_max", "congestion_min", "congestion_max",
)


@dataclass
class ForecastQuery:
    routes: list[int]
    horizon: str
    date_from: Date
    date_to: Date
    hour_from: int = 0
    hour_to: int = 23
    grouping: str = "route"
    stop: str | None = None
    hour: int | None = None
    coefficients: dict[str, float] = field(default_factory=dict)
    filters: dict[str, Any] = field(default_factory=dict)
    model: str = settings.DEFAULT_MODEL

    @property
    def multiplier(self) -> float:
        value = 1.0
        for key in ("k_weather", "k_event", "k_season", "k_traffic"):
            value *= float(self.coefficients.get(key, settings.K_DEFAULT))
        return value

    def cache_key(self) -> str:
        payload = {
            "routes": sorted(self.routes), "model": self.model,
            "date_from": self.date_from.isoformat(), "date_to": self.date_to.isoformat(),
            "hour_from": self.hour_from, "hour_to": self.hour_to,
            "filters": {k: self.filters[k] for k in sorted(self.filters)},
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


@dataclass
class ForecastResult:
    """Per-hour predictions plus the metadata the API layer reports back."""

    predictions: list[dict]
    actuals: dict[tuple[int, str, int], float]
    warnings: list[str]
    run_id: str
    model: str
    origin: Date
    cache_hit: bool
    ml_latency_ms: float | None
    rows_sent: int
    excluded_by_filters: int
    coverage_note: str | None

    def meta(self, request_id: str | None, horizon: str) -> dict:
        return {
            "external_data_stale": False,
            "estimated": horizon in ("month", "year"),
            "request_id": request_id,
            "run_id": self.run_id,
            "model": self.model,
            "origin": self.origin.isoformat(),
            "cache_hit": self.cache_hit,
            "rows": len(self.predictions),
            "excluded_by_filters": self.excluded_by_filters,
            "warnings": self.warnings,
            "note": self.coverage_note,
        }


def parse_routes(value: str | None, available: set[int]) -> list[int]:
    if not value:
        raise ValidationException("Не указан маршрут")
    routes = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            route_id = int(part)
        except ValueError:
            raise ValidationException(f"Некорректный идентификатор маршрута: {part}")
        if route_id not in available:
            raise ValidationException(f"Маршрут {route_id} отсутствует в данных")
        routes.append(route_id)
    if not routes:
        raise ValidationException("Не указан маршрут")
    return sorted(set(routes))


def parse_hour(value: str | None, default: int) -> int:
    if not value:
        return default
    try:
        hour = int(str(value).split(":")[0])
    except ValueError:
        raise ValidationException(f"Некорректное время: {value}")
    return max(0, min(23, hour))


def validate_period(horizon: str, date_from: Date, date_to: Date) -> None:
    if horizon not in HORIZONS:
        raise ValidationException(f"Некорректный горизонт: {horizon}")
    if date_from > date_to:
        raise ValidationException("Дата начала периода не может быть позже даты окончания")
    days = (date_to - date_from).days + 1
    limits = {"day": (31, "Период прогноза на день не может превышать 31 день"),
              "month": (366, "Период прогноза на месяц не может превышать 12 месяцев"),
              "year": (365 * 3, "Период прогноза на год не может превышать 3 года")}
    limit, message = limits[horizon]
    if days > limit:
        raise ValidationException(f"{message}. Сократите период или измените горизонт.")


def validate_coefficients(coefficients: dict[str, float]) -> None:
    for name, value in coefficients.items():
        if value is None:
            continue
        if not settings.K_MIN <= float(value) <= settings.K_MAX:
            raise ValidationException(
                f"Коэффициент {name} должен быть в диапазоне {settings.K_MIN}–{settings.K_MAX}")


class ForecastService:
    def __init__(self, etl: ETLClient, ml: MLClient):
        self.etl = etl
        self.ml = ml
        self._coverage: tuple[Date, Date] | None = None

    async def coverage(self, request_id: str | None = None) -> tuple[Date, Date]:
        """Earliest and latest date present in features_hourly."""
        if self._coverage is None:
            rows = await self.etl.coverage(request_id)
            if not rows:
                raise ValidationException("В базе нет данных для прогноза")
            self._coverage = (
                min(Date.fromisoformat(r["date_from"]) for r in rows),
                max(Date.fromisoformat(r["date_to"]) for r in rows),
            )
        return self._coverage

    async def clamp(self, query: ForecastQuery, request_id: str | None = None) -> str | None:
        """Move a requested period into the range covered by the dataset."""
        available_from, available_to = await self.coverage(request_id)
        if query.date_from >= available_from and query.date_to <= available_to:
            return None
        span = (query.date_to - query.date_from).days
        original = (query.date_from, query.date_to)
        if query.date_from > available_to:
            query.date_to = available_to
            query.date_from = max(available_from, available_to - timedelta(days=span))
        elif query.date_to < available_from:
            query.date_from = available_from
            query.date_to = min(available_to, available_from + timedelta(days=span))
        else:
            query.date_from = max(query.date_from, available_from)
            query.date_to = min(query.date_to, available_to)
        return (f"Запрошенный период {original[0]}—{original[1]} выходит за границы данных "
                f"({available_from}—{available_to}); показан период "
                f"{query.date_from}—{query.date_to}.")

    async def run(self, query: ForecastQuery, request_id: str | None = None,
                  user_id: str | None = None) -> ForecastResult:
        note = await self.clamp(query, request_id)
        cache_key = query.cache_key()

        window = await self.etl.window(
            query.routes, query.date_from.isoformat(), query.date_to.isoformat(),
            query.hour_from, query.hour_to, query.filters, request_id)
        rows_to_forecast = window["rows"]
        if not rows_to_forecast:
            raise ValidationException(
                "Под заданные ограничения не попал ни один час. Ослабьте фильтры или расширьте период.")
        actuals = {
            (a["route_id"], a["date"], a["hour"]): float(a["boardings"])
            for a in window.get("actuals", [])
        }
        excluded = int(window.get("excluded_by_filters", 0))

        cached = await self.etl.load_run(cache_key, request_id)
        if cached.get("found"):
            run = cached["run"]
            logger.info("forecast cache hit run_id=%s rows=%s", run["run_id"], len(cached["predictions"]))
            return ForecastResult(
                predictions=cached["predictions"], actuals=actuals, warnings=list(run.get("warnings") or []),
                run_id=run["run_id"], model=run["model"], origin=Date.fromisoformat(run["origin"]),
                cache_hit=True, ml_latency_ms=run.get("ml_latency_ms"), rows_sent=int(run.get("rows_sent") or 0),
                excluded_by_filters=excluded, coverage_note=note,
            )

        origin = query.date_from
        history = await self.etl.history(
            query.routes,
            (origin - timedelta(days=settings.HISTORY_DAYS)).isoformat(),
            (origin - timedelta(days=1)).isoformat(),
            request_id,
        )

        started = time.perf_counter()
        response = await self.ml.predict(history + rows_to_forecast, origin.isoformat(), query.model, request_id)
        latency_ms = round((time.perf_counter() - started) * 1000, 2)

        predictions = response.get("predictions", [])
        warnings = list(response.get("warnings") or [])
        if not history:
            warnings.append("История за 56 дней до начала периода отсутствует: прогноз построен без профилей.")

        run_id = str(uuid.uuid4())
        await self.etl.save_run({
            "run_id": run_id,
            "request_id": request_id,
            "user_id": user_id,
            "model": response.get("model", query.model),
            "model_version": response.get("model", query.model),
            "origin": response.get("origin", origin.isoformat()),
            "date_from": query.date_from.isoformat(),
            "date_to": query.date_to.isoformat(),
            "horizon": query.horizon,
            "horizon_days": int(response.get("horizon_days", 0)),
            "rows_sent": len(history) + len(rows_to_forecast),
            "total_prediction": float(response.get("total_prediction", 0.0)),
            "ml_latency_ms": latency_ms,
            "cache_key": cache_key,
            "routes": query.routes,
            "filters": query.filters,
            "coefficients": query.coefficients,
            "warnings": warnings,
            "predictions": predictions,
        }, request_id)

        return ForecastResult(
            predictions=predictions, actuals=actuals, warnings=warnings, run_id=run_id,
            model=response.get("model", query.model),
            origin=Date.fromisoformat(response.get("origin", origin.isoformat())),
            cache_hit=False, ml_latency_ms=latency_ms,
            rows_sent=len(history) + len(rows_to_forecast),
            excluded_by_filters=excluded, coverage_note=note,
        )


# --------------------------------------------------------------------------
# Aggregation helpers: turn per-route-hour predictions into the view shapes.
# --------------------------------------------------------------------------

def _bucket(date_str: str, hour: int, horizon: str) -> str:
    if horizon == "day":
        return f"{date_str}T{hour:02d}:00:00"
    if horizon == "month":
        return date_str
    return date_str[:7]


def time_series(result: ForecastResult, query: ForecastQuery, weight: float = 1.0) -> list[dict]:
    baseline: dict[str, float] = defaultdict(float)
    actual: dict[str, float] = defaultdict(float)
    has_actual: dict[str, bool] = defaultdict(bool)

    for row in result.predictions:
        if not query.hour_from <= int(row["hour"]) <= query.hour_to:
            continue
        key = _bucket(row["date"], int(row["hour"]), query.horizon)
        baseline[key] += float(row["prediction"]) * weight
        fact = result.actuals.get((int(row["route_id"]), row["date"], int(row["hour"])))
        if fact is not None:
            actual[key] += fact * weight
            has_actual[key] = True

    multiplier = query.multiplier
    return [
        {
            "ts": key,
            "baseline": round(baseline[key], 1),
            "adjusted": round(baseline[key] * multiplier, 1),
            "actual": round(actual[key], 1) if has_actual[key] else None,
        }
        for key in sorted(baseline)
    ]


def route_hour_totals(result: ForecastResult, date: str) -> dict[int, float]:
    """Total predicted boardings per hour on one date, summed over routes."""
    totals: dict[int, float] = defaultdict(float)
    for row in result.predictions:
        if row["date"] == date:
            totals[int(row["hour"])] += float(row["prediction"])
    return totals


def pick_date(result: ForecastResult, requested: str | None) -> str:
    dates = sorted({row["date"] for row in result.predictions})
    if not dates:
        raise ValidationException("Нет данных для выбранного периода")
    if requested and requested in dates:
        return requested
    return dates[0]


def load_level(value: float, peak: float) -> str:
    if peak <= 0:
        return "low"
    share = value / peak
    return "high" if share >= 0.66 else "medium" if share >= 0.33 else "low"


def effect(series: list[dict]) -> dict:
    baseline = sum(point["baseline"] for point in series)
    adjusted = sum(point["adjusted"] for point in series)
    delta = adjusted - baseline
    return {
        "delta_passengers": round(delta, 1),
        "delta_percent": round((delta / baseline * 100.0), 2) if baseline else 0.0,
    }


def iso_now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")

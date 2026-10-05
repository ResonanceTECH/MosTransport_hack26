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
# Bump when the way predictions are produced changes, so stale stored runs are not reused.
CACHE_VERSION = 2
# A stop at its route's historical p95 hourly demand is shown as this share of capacity.
P95_OCCUPANCY = 0.85
LEVEL_MEDIUM_PCT = 30.0
LEVEL_HIGH_PCT = 70.0


def shift_years(value: Date, years: int) -> Date:
    try:
        return value.replace(year=value.year + years)
    except ValueError:  # 29 February in a non-leap target year
        return value.replace(year=value.year + years, day=28)


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
    segment_from: str | None = None
    segment_to: str | None = None
    hour: int | None = None
    coefficients: dict[str, float] = field(default_factory=dict)
    filters: dict[str, Any] = field(default_factory=dict)
    model: str = settings.DEFAULT_MODEL
    # Whole years the requested period was moved by to land inside the dataset.
    year_shift: int = 0

    @property
    def multiplier(self) -> float:
        value = 1.0
        for key in ("k_weather", "k_event", "k_season", "k_traffic"):
            value *= float(self.coefficients.get(key, settings.K_DEFAULT))
        return value

    def cache_key(self) -> str:
        payload = {
            "v": CACHE_VERSION,
            "routes": sorted(self.routes), "model": self.model,
            "date_from": self.date_from.isoformat(), "date_to": self.date_to.isoformat(),
            "hour_from": self.hour_from, "hour_to": self.hour_to,
            "filters": {k: self.filters[k] for k in sorted(self.filters)},
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()

    def dataset_date(self, requested: str | None) -> str | None:
        """Translate a date from the UI into the dataset calendar."""
        if not requested:
            return None
        try:
            return shift_years(Date.fromisoformat(requested), self.year_shift).isoformat()
        except ValueError:
            return None


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


@dataclass
class Coverage:
    date_from: Date
    date_to: Date
    # Last date with observed boardings; later dates are forecast-only.
    last_known: Date


class ForecastService:
    def __init__(self, etl: ETLClient, ml: MLClient):
        self.etl = etl
        self.ml = ml
        self._coverage: Coverage | None = None
        self._capacity: dict[int, float] | None = None

    async def coverage(self, request_id: str | None = None) -> Coverage:
        if self._coverage is None:
            payload = await self.etl.coverage(request_id)
            rows = payload.get("coverage") or []
            if not rows:
                raise ValidationException("В базе нет данных для прогноза")
            date_from = min(Date.fromisoformat(r["date_from"]) for r in rows)
            date_to = max(Date.fromisoformat(r["date_to"]) for r in rows)
            last_known = Date.fromisoformat(payload["last_known_date"]) if payload.get("last_known_date") else date_to
            self._coverage = Coverage(date_from, date_to, last_known)
        return self._coverage

    async def capacity(self, request_id: str | None = None) -> dict[int, float]:
        """Hourly boardings per route that corresponds to 100 % load."""
        if self._capacity is None:
            rows = await self.etl.route_capacity(request_id)
            self._capacity = {int(r["route_id"]): max(float(r["p95_hourly"]) / P95_OCCUPANCY, 1.0) for r in rows}
        return self._capacity

    async def clamp(self, query: ForecastQuery, request_id: str | None = None) -> str | None:
        """Move a requested period into the range covered by the dataset.

        Dates in other years are mapped to the same calendar days of the dataset
        year, so "today" in the UI shows the analogous day rather than an edge date.
        """
        cov = await self.coverage(request_id)
        if query.date_from >= cov.date_from and query.date_to <= cov.date_to:
            return None
        original = (query.date_from, query.date_to)

        candidates = {cov.date_to.year - query.date_to.year, cov.date_from.year - query.date_from.year}
        for years in sorted(candidates, key=abs):
            shifted_from, shifted_to = shift_years(query.date_from, years), shift_years(query.date_to, years)
            if shifted_from >= cov.date_from and shifted_to <= cov.date_to:
                query.date_from, query.date_to, query.year_shift = shifted_from, shifted_to, years
                return (f"Данных за {original[0]}—{original[1]} нет; показан аналогичный период "
                        f"{query.date_from}—{query.date_to}.")

        span = (query.date_to - query.date_from).days
        if query.date_from > cov.date_to:
            query.date_to = cov.date_to
            query.date_from = max(cov.date_from, cov.date_to - timedelta(days=span))
        elif query.date_to < cov.date_from:
            query.date_from = cov.date_from
            query.date_to = min(cov.date_to, cov.date_from + timedelta(days=span))
        else:
            query.date_from = max(query.date_from, cov.date_from)
            query.date_to = min(query.date_to, cov.date_to)
        return (f"Запрошенный период {original[0]}—{original[1]} выходит за границы данных "
                f"({cov.date_from}—{cov.date_to}); показан период {query.date_from}—{query.date_to}.")

    async def run(self, query: ForecastQuery, request_id: str | None = None,
                  user_id: str | None = None) -> ForecastResult:
        note = await self.clamp(query, request_id)
        cov = await self.coverage(request_id)
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

        # The model builds its profiles from the 56 days before `origin`. For a
        # period after the last observed day, start the forecast right after it,
        # otherwise the history window would contain no boardings at all.
        origin = min(query.date_from, cov.last_known + timedelta(days=1))
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

def selection_weights(query: ForecastQuery, stops_by_route: dict[int, list[dict]]) -> dict[int, float] | None:
    """Share of each route's boardings covered by the selected stop or segment.

    None means no stop-level selection: whole routes are counted.
    """
    if query.stop:
        weights = {route_id: 0.0 for route_id in query.routes}
        for route_id, stops in stops_by_route.items():
            for stop in stops:
                if stop["stop_id"] == query.stop:
                    weights[route_id] = float(stop["load_weight"])
        if not any(weights.values()):
            raise ValidationException(f"Остановка {query.stop} не относится к выбранным маршрутам")
        return weights
    if query.segment_from and query.segment_to:
        weights = {route_id: 0.0 for route_id in query.routes}
        for route_id, stops in stops_by_route.items():
            sequence = {stop["stop_id"]: stop["sequence"] for stop in stops}
            if query.segment_from in sequence and query.segment_to in sequence:
                low, high = sorted((sequence[query.segment_from], sequence[query.segment_to]))
                weights[route_id] = sum(float(s["load_weight"]) for s in stops if low <= s["sequence"] <= high)
        if not any(weights.values()):
            raise ValidationException("Участок не относится к выбранным маршрутам")
        return weights
    return None


def _bucket(date_str: str, hour: int, horizon: str) -> str:
    if horizon == "day":
        return f"{date_str}T{hour:02d}:00:00"
    if horizon == "month":
        return date_str
    return date_str[:7]


def time_series(result: ForecastResult, query: ForecastQuery,
                weights: dict[int, float] | None = None) -> list[dict]:
    baseline: dict[str, float] = defaultdict(float)
    actual: dict[str, float] = defaultdict(float)
    has_actual: dict[str, bool] = defaultdict(bool)

    for row in result.predictions:
        if not query.hour_from <= int(row["hour"]) <= query.hour_to:
            continue
        weight = 1.0 if weights is None else weights.get(int(row["route_id"]), 0.0)
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


def pick_date(result: ForecastResult, query: ForecastQuery, requested: str | None) -> str:
    dates = sorted({row["date"] for row in result.predictions})
    if not dates:
        raise ValidationException("Нет данных для выбранного периода")
    wanted = query.dataset_date(requested)
    if wanted and wanted in dates:
        return wanted
    return dates[0]


def stop_capacity(route_capacity: float, stops_on_route: int) -> float:
    """Equal capacity for every stop of a route, so busier stops show a higher load."""
    return route_capacity / max(stops_on_route, 1)


def occupancy_pct(load: float, capacity: float) -> float:
    return round(load / capacity * 100.0, 1) if capacity > 0 else 0.0


def load_level(pct: float) -> str:
    if pct >= LEVEL_HIGH_PCT:
        return "high"
    if pct >= LEVEL_MEDIUM_PCT:
        return "medium"
    return "low"


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

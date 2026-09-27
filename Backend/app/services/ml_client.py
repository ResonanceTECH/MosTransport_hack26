"""Client for the ML prediction service.

The service contract is fixed: `POST /predict` accepts rows that contain
exactly the fields of its FeatureRow schema. The database holds more columns
than that, so every row is passed through `to_schema_row` before it leaves this
process. Nothing outside the whitelist is ever sent to the model.
"""

from __future__ import annotations

import logging
from typing import Any, Iterable

import httpx

from app.config import settings
from app.core.exceptions import ServiceUnavailableException

logger = logging.getLogger("backend")

# The 18 fields of the ML /predict FeatureRow schema, in schema order.
ML_SCHEMA_FIELDS: tuple[str, ...] = (
    "route_id",
    "date",
    "hour",
    "boardings",
    "day_type",
    "is_dayoff",
    "is_short_day",
    "is_holiday",
    "is_transfer_workday",
    "temperature_c",
    "precipitation_mm",
    "snowfall_cm",
    "precip_type",
    "wind_speed_ms",
    "humidity_pct",
    "cloud_cover_pct",
    "traffic_congestion_index",
    "traffic_duration_s",
)

REQUIRED_FIELDS: tuple[str, ...] = (
    "route_id", "date", "hour", "day_type",
    "is_dayoff", "is_short_day", "is_holiday", "is_transfer_workday",
)


def to_schema_row(row: dict[str, Any]) -> dict[str, Any]:
    """Project a database row onto the ML schema, dropping every extra column."""
    missing = [field for field in REQUIRED_FIELDS if row.get(field) is None]
    if missing:
        raise ValueError(f"row is missing required ML schema fields: {missing}")
    return {field: row.get(field) for field in ML_SCHEMA_FIELDS}


def to_schema_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [to_schema_row(row) for row in rows]


class MLClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=settings.ML_TIMEOUT_SECONDS,
                                  write=settings.ML_TIMEOUT_SECONDS, pool=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    async def predict(self, rows: list[dict[str, Any]], origin: str, model: str,
                      request_id: str | None = None) -> dict:
        """Send a prediction request built strictly from the ML schema."""
        payload = {"model": model, "origin": origin, "rows": to_schema_rows(rows)}
        headers = {"X-Request-ID": request_id} if request_id else {}
        try:
            response = await self._client.post(f"{self.base_url}/predict", json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise ServiceUnavailableException(
                "Сервис прогнозирования недоступен. Повторите попытку позже.",
                {"reason": type(exc).__name__},
            ) from exc
        if response.status_code >= 400:
            detail = _error_detail(response)
            logger.error("ML /predict failed: %s %s", response.status_code, detail)
            raise ServiceUnavailableException(
                f"Сервис прогнозирования вернул ошибку: {detail}",
                {"status": response.status_code},
            )
        return response.json()

    async def health(self) -> dict:
        response = await self._client.get(f"{self.base_url}/health", timeout=5.0)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()


def _error_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text[:200]
    error = body.get("error") if isinstance(body, dict) else None
    if isinstance(error, dict):
        return str(error.get("message") or error.get("code") or body)[:200]
    return str(body)[:200]

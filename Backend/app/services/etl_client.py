"""Client for the ETL service, which owns the service database."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings
from app.core.exceptions import NotFoundException, ServiceUnavailableException

logger = logging.getLogger("backend")


class ETLClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=settings.ETL_TIMEOUT_SECONDS,
                                  write=settings.ETL_TIMEOUT_SECONDS, pool=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    async def _request(self, method: str, path: str, request_id: str | None = None, **kwargs) -> Any:
        headers = kwargs.pop("headers", {})
        if request_id:
            headers["X-Request-ID"] = request_id
        try:
            response = await self._client.request(method, f"{self.base_url}{path}", headers=headers, **kwargs)
        except httpx.HTTPError as exc:
            raise ServiceUnavailableException(
                "Сервис данных недоступен. Повторите попытку позже.",
                {"reason": type(exc).__name__},
            ) from exc
        if response.status_code == 404:
            raise NotFoundException("Запрошенные данные не найдены")
        if response.status_code >= 400:
            logger.error("ETL %s %s failed: %s %s", method, path, response.status_code, response.text[:200])
            raise ServiceUnavailableException(
                "Сервис данных вернул ошибку", {"status": response.status_code})
        return response.json()

    async def routes(self, request_id: str | None = None) -> list[dict]:
        return (await self._request("GET", "/etl/v1/reference/routes", request_id))["routes"]

    async def stops(self, route_id: int, request_id: str | None = None) -> list[dict]:
        return (await self._request("GET", f"/etl/v1/reference/routes/{route_id}/stops", request_id))["stops"]

    async def all_stops(self, request_id: str | None = None) -> list[dict]:
        return (await self._request("GET", "/etl/v1/reference/stops", request_id))["stops"]

    async def geometry(self, route_id: int, request_id: str | None = None) -> dict:
        return await self._request("GET", f"/etl/v1/reference/routes/{route_id}/geometry", request_id)

    async def history(self, routes: list[int], date_from: str, date_to: str,
                      request_id: str | None = None) -> list[dict]:
        payload = await self._request("GET", "/etl/v1/features/history", request_id, params={
            "routes": ",".join(str(r) for r in routes), "date_from": date_from, "date_to": date_to})
        return payload["rows"]

    async def window(self, routes: list[int], date_from: str, date_to: str, hour_from: int, hour_to: int,
                     filters: dict[str, Any] | None = None, request_id: str | None = None) -> dict:
        params: list[tuple[str, Any]] = [
            ("routes", ",".join(str(r) for r in routes)),
            ("date_from", date_from), ("date_to", date_to),
            ("hour_from", hour_from), ("hour_to", hour_to),
        ]
        for key, value in (filters or {}).items():
            if value is None:
                continue
            if isinstance(value, (list, tuple, set)):
                params.extend((key, item) for item in value)
            else:
                params.append((key, value))
        return await self._request("GET", "/etl/v1/features/window", request_id, params=params)

    async def filter_options(self, request_id: str | None = None) -> dict:
        return await self._request("GET", "/etl/v1/filters/options", request_id)

    async def coverage(self, request_id: str | None = None) -> list[dict]:
        return (await self._request("GET", "/etl/v1/coverage", request_id))["coverage"]

    async def load_run(self, cache_key: str, request_id: str | None = None) -> dict:
        return await self._request("GET", "/etl/v1/forecasts", request_id, params={"cache_key": cache_key})

    async def save_run(self, payload: dict, request_id: str | None = None) -> dict:
        return await self._request("POST", "/etl/v1/forecasts", request_id, json=payload)

    async def recent_runs(self, limit: int = 20, request_id: str | None = None) -> list[dict]:
        return (await self._request("GET", "/etl/v1/forecasts/runs", request_id,
                                    params={"limit": limit}))["runs"]

    async def trigger_ingest(self, force: bool = False, request_id: str | None = None) -> dict:
        return await self._request("POST", "/etl/v1/ingest", request_id, params={"force": force})

    async def health(self) -> dict:
        response = await self._client.get(f"{self.base_url}/health/live", timeout=3.0)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()

"""Async client for ETL service."""

import httpx
from fastapi import Request


class ETLClient:
    """Client for ETL service API."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.timeout = httpx.Timeout(connect=0.5, read=2.0, write=2.0, pool=1.0)

    async def _request(
        self,
        method: str,
        path: str,
        request: Request,
        **kwargs,
    ) -> dict:
        """Make request to ETL service with request ID propagation."""
        request_id = getattr(request.state, "request_id", None)
        headers = kwargs.pop("headers", {})
        if request_id:
            headers["X-Request-ID"] = request_id

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method=method,
                url=f"{self.base_url}{path}",
                headers=headers,
                **kwargs,
            )
            response.raise_for_status()
            return response.json()

    async def get_forecast(self, request: Request, params: dict) -> dict:
        """Get forecast from ETL."""
        return await self._request("GET", "/etl/v1/forecast", request, params=params)

    async def get_forecast_map(self, request: Request, params: dict) -> dict:
        """Get forecast map data from ETL."""
        return await self._request("GET", "/etl/v1/forecast/map", request, params=params)

    async def get_routes(self, request: Request) -> dict:
        """Get routes list from ETL."""
        return await self._request("GET", "/etl/v1/reference/routes", request)

    async def get_route_stops(self, request: Request, route_id: str) -> dict:
        """Get route stops from ETL."""
        return await self._request("GET", f"/etl/v1/reference/routes/{route_id}/stops", request)

    async def get_route_geometry(self, request: Request, route_id: str) -> dict:
        """Get route geometry from ETL."""
        return await self._request("GET", f"/etl/v1/reference/routes/{route_id}/geometry", request)

    async def precompute(self, request: Request) -> dict:
        """Trigger forecast precomputation."""
        return await self._request("POST", "/etl/v1/forecast/precompute", request)

    async def close(self):
        """Close client (placeholder for connection pool cleanup)."""
        pass

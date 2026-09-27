"""Routes API - proxy to ETL reference data."""

import time

from fastapi import APIRouter, Depends, Request

router = APIRouter()

# Simple in-memory cache
_cache: dict = {}
_cache_ttl = 600  # 10 minutes


def _get_cached(key: str):
    """Get cached value if not expired."""
    if key in _cache:
        value, ts = _cache[key]
        if time.time() - ts < _cache_ttl:
            return value
        del _cache[key]
    return None


def _set_cached(key: str, value):
    """Set cached value."""
    _cache[key] = (value, time.time())


@router.get("/routes")
async def list_routes(request: Request):
    """List all tram routes."""
    cached = _get_cached("routes")
    if cached:
        return cached

    etl_client = request.app.state.etl_client
    result = await etl_client.get_routes(request)
    _set_cached("routes", result)
    return result


@router.get("/routes/{route_id}/stops")
async def get_route_stops(route_id: str, request: Request):
    """Get stops for a route."""
    cache_key = f"stops:{route_id}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    etl_client = request.app.state.etl_client
    result = await etl_client.get_route_stops(request, route_id)
    _set_cached(cache_key, result)
    return result


@router.get("/routes/{route_id}/geometry")
async def get_route_geometry(route_id: str, request: Request):
    """Get route geometry as GeoJSON."""
    cache_key = f"geometry:{route_id}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    etl_client = request.app.state.etl_client
    result = await etl_client.get_route_geometry(request, route_id)
    _set_cached(cache_key, result)
    return result

"""Reference data API - routes, stops, geometry."""

import logging
from fastapi import APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)

# Stub data for reference
STUB_ROUTES = [
    {"route_id": "1", "name": "1 трамвай", "color": "#FF0000"},
    {"route_id": "5", "name": "5 трамвай", "color": "#00FF00"},
    {"route_id": "7", "name": "7 трамвай", "color": "#0000FF"},
    {"route_id": "11", "name": "11 трамвай", "color": "#FFFF00"},
    {"route_id": "12", "name": "12 трамвай", "color": "#FF00FF"},
    {"route_id": "17", "name": "17 трамвай", "color": "#00FFFF"},
    {"route_id": "25", "name": "25 трамвай", "color": "#FFA500"},
    {"route_id": "26", "name": "26 трамвай", "color": "#800080"},
    {"route_id": "28", "name": "28 трамвай", "color": "#008000"},
    {"route_id": "50", "name": "50 трамвай", "color": "#FFC0CB"},
]


@router.get("/reference/routes")
async def get_routes():
    """Get all routes."""
    return {"routes": STUB_ROUTES}


@router.get("/reference/routes/{route_id}/stops")
async def get_route_stops(route_id: str):
    """Get stops for a route."""
    # TODO: Read from DB
    return {
        "route_id": route_id,
        "stops": [],
    }


@router.get("/reference/routes/{route_id}/geometry")
async def get_route_geometry(route_id: str):
    """Get route geometry as GeoJSON."""
    # TODO: Read from DB
    return {
        "type": "Feature",
        "properties": {"route_id": route_id},
        "geometry": {
            "type": "LineString",
            "coordinates": [],
        },
    }

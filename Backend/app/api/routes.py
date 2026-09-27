"""Reference endpoints: routes, stops, geometry and the available filter options."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import service
from app.core.exceptions import NotFoundException

router = APIRouter()


@router.get("/routes")
async def list_routes(request: Request) -> dict:
    routes = await service(request).etl.routes(getattr(request.state, "request_id", None))
    return {"items": [
        {"id": route["route_id"], "number": route["number"], "name": route["name"], "color": route["color"]}
        for route in routes
    ]}


@router.get("/routes/{route_id}")
async def get_route(route_id: str, request: Request) -> dict:
    request_id = getattr(request.state, "request_id", None)
    etl = service(request).etl
    routes = {route["route_id"]: route for route in await etl.routes(request_id)}
    route = routes.get(route_id)
    if route is None:
        raise NotFoundException(f"Маршрут {route_id} не найден")
    stops = await etl.stops(int(route_id), request_id)
    return {
        "id": route["route_id"], "number": route["number"], "name": route["name"], "color": route["color"],
        "stops": [
            {"id": stop["stop_id"], "name": stop["name"], "lat": stop["lat"],
             "lon": stop["lon"], "sequence": stop["sequence"]}
            for stop in stops
        ],
    }


@router.get("/routes/{route_id}/geometry")
async def get_route_geometry(route_id: str, request: Request) -> dict:
    geometry = await service(request).etl.geometry(int(route_id), getattr(request.state, "request_id", None))
    return {"route_id": route_id, "type": geometry["type"], "coordinates": geometry["coordinates"]}


@router.get("/filters/options")
async def filter_options(request: Request) -> dict:
    """Values of the database-only columns that the UI may constrain.

    These columns exist in the database but are not part of the ML /predict
    schema: they restrict which hours are forecast, they are not model inputs.
    """
    options = await service(request).etl.filter_options(getattr(request.state, "request_id", None))
    return {
        **options,
        "applies_to": "forecast window selection",
        "sent_to_model": False,
    }

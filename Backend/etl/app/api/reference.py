"""Reference data served from the service database."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core import db

router = APIRouter()


@router.get("/reference/routes")
async def get_routes() -> dict:
    rows = await db.pool().fetch(
        "SELECT route_id, number, name, color FROM routes ORDER BY route_id")
    return {"routes": [
        {"route_id": str(r["route_id"]), "number": r["number"], "name": r["name"], "color": r["color"]}
        for r in rows
    ]}


@router.get("/reference/routes/{route_id}/stops")
async def get_route_stops(route_id: int) -> dict:
    rows = await db.pool().fetch(
        """SELECT stop_id, name, latitude, longitude, sequence, load_weight
           FROM stops WHERE route_id = $1 ORDER BY sequence""", route_id)
    if not rows:
        raise HTTPException(status_code=404, detail=f"route {route_id} not found")
    return {"route_id": str(route_id), "stops": [
        {"stop_id": r["stop_id"], "name": r["name"], "lat": float(r["latitude"]),
         "lon": float(r["longitude"]), "sequence": r["sequence"], "load_weight": float(r["load_weight"])}
        for r in rows
    ]}


@router.get("/reference/routes/{route_id}/geometry")
async def get_route_geometry(route_id: int) -> dict:
    geometry = await db.pool().fetchval(
        "SELECT geometry FROM route_geometry WHERE route_id = $1", route_id)
    if geometry is None:
        raise HTTPException(status_code=404, detail=f"geometry for route {route_id} not found")
    return {"route_id": str(route_id), **geometry}


@router.get("/reference/stops")
async def get_all_stops() -> dict:
    rows = await db.pool().fetch(
        """SELECT stop_id, route_id, name, latitude, longitude, sequence, load_weight
           FROM stops ORDER BY route_id, sequence""")
    return {"stops": [
        {"stop_id": r["stop_id"], "route_id": str(r["route_id"]), "name": r["name"],
         "lat": float(r["latitude"]), "lon": float(r["longitude"]),
         "sequence": r["sequence"], "load_weight": float(r["load_weight"])}
        for r in rows
    ]}

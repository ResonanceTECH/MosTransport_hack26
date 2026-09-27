"""Persistence of ML runs and their predictions in the service database."""

from __future__ import annotations

import uuid
from datetime import date as Date

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.core import db

router = APIRouter()


class PredictionRow(BaseModel):
    route_id: int
    date: Date
    hour: int = Field(ge=0, le=23)
    prediction: float = Field(ge=0)


class RunPayload(BaseModel):
    run_id: uuid.UUID | None = None
    request_id: uuid.UUID | None = None
    user_id: str | None = None
    model: str
    model_version: str | None = None
    origin: Date
    date_from: Date
    date_to: Date
    horizon: str
    horizon_days: int = Field(ge=0)
    rows_sent: int = Field(ge=0)
    total_prediction: float = Field(ge=0)
    ml_latency_ms: float | None = None
    cache_key: str
    routes: list[int]
    filters: dict = Field(default_factory=dict)
    coefficients: dict = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    predictions: list[PredictionRow]


@router.post("/forecasts", status_code=201)
async def save_run(payload: RunPayload) -> dict:
    """Store one inference run together with every predicted hour."""
    run_id = payload.run_id or uuid.uuid4()
    async with db.pool().acquire() as connection:
        async with connection.transaction():
            await connection.execute(
                """INSERT INTO forecast_runs (
                       run_id, request_id, user_id, model, model_version, origin, date_from, date_to,
                       horizon, horizon_days, rows_predicted, rows_sent, total_prediction,
                       ml_latency_ms, cache_key, routes, filters, coefficients, warnings)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)""",
                run_id, payload.request_id, payload.user_id, payload.model, payload.model_version,
                payload.origin, payload.date_from, payload.date_to, payload.horizon, payload.horizon_days,
                len(payload.predictions), payload.rows_sent, payload.total_prediction,
                payload.ml_latency_ms, payload.cache_key, payload.routes,
                payload.filters, payload.coefficients, payload.warnings,
            )
            await connection.copy_records_to_table(
                "forecasts",
                records=[(run_id, p.route_id, p.date, p.hour, p.prediction) for p in payload.predictions],
                columns=["run_id", "route_id", "date", "hour", "prediction"],
            )
    return {"run_id": str(run_id), "rows": len(payload.predictions)}


@router.get("/forecasts")
async def load_run(cache_key: str = Query(..., description="Signature of routes, window and filters")) -> dict:
    """Return the most recent stored run for a cache key, if any."""
    run = await db.pool().fetchrow(
        """SELECT run_id, created_at, model, model_version, origin, date_from, date_to, horizon,
                  horizon_days, rows_predicted, rows_sent, total_prediction, ml_latency_ms, warnings
           FROM forecast_runs WHERE cache_key = $1 ORDER BY created_at DESC LIMIT 1""", cache_key)
    if run is None:
        return {"found": False}
    rows = await db.pool().fetch(
        "SELECT route_id, date, hour, prediction FROM forecasts WHERE run_id = $1 ORDER BY route_id, date, hour",
        run["run_id"])
    return {
        "found": True,
        "run": {
            "run_id": str(run["run_id"]), "created_at": run["created_at"].isoformat(),
            "model": run["model"], "model_version": run["model_version"],
            "origin": run["origin"].isoformat(), "date_from": run["date_from"].isoformat(),
            "date_to": run["date_to"].isoformat(), "horizon": run["horizon"],
            "horizon_days": run["horizon_days"], "rows_predicted": run["rows_predicted"],
            "rows_sent": run["rows_sent"], "total_prediction": float(run["total_prediction"]),
            "ml_latency_ms": run["ml_latency_ms"], "warnings": run["warnings"],
        },
        "predictions": [
            {"route_id": int(r["route_id"]), "date": r["date"].isoformat(),
             "hour": int(r["hour"]), "prediction": float(r["prediction"])}
            for r in rows
        ],
    }


@router.get("/forecasts/runs")
async def recent_runs(limit: int = Query(20, ge=1, le=200)) -> dict:
    rows = await db.pool().fetch(
        """SELECT run_id, created_at, model, origin, date_from, date_to, horizon,
                  rows_predicted, total_prediction, ml_latency_ms, routes
           FROM forecast_runs ORDER BY created_at DESC LIMIT $1""", limit)
    return {"runs": [
        {"run_id": str(r["run_id"]), "created_at": r["created_at"].isoformat(), "model": r["model"],
         "origin": r["origin"].isoformat(), "date_from": r["date_from"].isoformat(),
         "date_to": r["date_to"].isoformat(), "horizon": r["horizon"],
         "rows_predicted": int(r["rows_predicted"]), "total_prediction": float(r["total_prediction"]),
         "ml_latency_ms": r["ml_latency_ms"], "routes": [str(x) for x in r["routes"]]}
        for r in rows
    ]}

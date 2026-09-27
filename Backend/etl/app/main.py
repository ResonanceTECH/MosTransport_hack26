"""ETL service: owns the service database, serves reference and feature data."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import features, forecasts, reference
from app.config import settings
from app.core import db
from app.core.logging import ObservabilityMiddleware, setup_logging

from app.pipeline import ingest

emitter = setup_logging("etl", settings.LOG_LEVEL)
logger = logging.getLogger("etl")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    app.state.ingest_status = {"status": "pending", "rows": 0}
    if settings.AUTO_INGEST:
        try:
            app.state.ingest_status = await ingest.run(db.pool(), settings.DATASET_PATH)
        except Exception as exc:
            app.state.ingest_status = {"status": "failed", "rows": 0, "reason": repr(exc)}
            logger.exception("startup ingest failed")
    logger.info("ETL service ready: %s", app.state.ingest_status)
    yield
    await db.close()


app = FastAPI(
    title="Moscow Transport Hack - ETL Service",
    description=("Owns the service database. Serves the reference network and feature rows in the "
                 "ML /predict schema, and stores the forecast runs produced by the Backend."),
    version="1.0.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)
app.add_middleware(ObservabilityMiddleware, emitter=emitter)
Instrumentator().instrument(app).expose(app)


@app.get("/health/live", tags=["health"])
async def health_live() -> dict:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def health_ready(request: Request) -> ORJSONResponse:
    try:
        await db.pool().fetchval("SELECT 1")
    except Exception:
        return ORJSONResponse(status_code=503, content={"status": "not_ready", "database": "unavailable"})
    status = getattr(request.app.state, "ingest_status", {})
    if status.get("status") == "failed":
        return ORJSONResponse(status_code=503, content={"status": "not_ready", "ingest": status})
    return {"status": "ready", "database": "available", "ingest": status}


@app.post("/etl/v1/ingest", tags=["ingest"])
async def run_ingest(request: Request, force: bool = False) -> dict:
    result = await ingest.run(db.pool(), settings.DATASET_PATH, force=force)
    request.app.state.ingest_status = result
    return result


@app.get("/etl/v1/ingest/status", tags=["ingest"])
async def ingest_status(request: Request) -> dict:
    return getattr(request.app.state, "ingest_status", {"status": "unknown"})


app.include_router(reference.router, prefix="/etl/v1", tags=["reference"])
app.include_router(features.router, prefix="/etl/v1", tags=["features"])
app.include_router(forecasts.router, prefix="/etl/v1", tags=["forecasts"])

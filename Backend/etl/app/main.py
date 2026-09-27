"""Main FastAPI application for ETL service."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import ORJSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import external, forecast, ingest, reference
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='{"ts": "%(asctime)s", "service": "etl", "level": "%(levelname)s", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("ETL service starting up")
    # TODO: Initialize DB pool, start background tasks
    yield
    logger.info("ETL service shutting down")


app = FastAPI(
    title="Moscow Transport Hack - ETL Service",
    description="Data ingestion, normalization, and forecast orchestration",
    version="0.1.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)


@app.get("/health/live")
async def health_live():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Readiness probe."""
    # TODO: Check DB connection
    return {"status": "ready"}


# Include routers
app.include_router(ingest.router, prefix="/etl/v1", tags=["ingest"])
app.include_router(forecast.router, prefix="/etl/v1", tags=["forecast"])
app.include_router(external.router, prefix="/etl/v1", tags=["external"])
app.include_router(reference.router, prefix="/etl/v1", tags=["reference"])

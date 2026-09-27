"""Main FastAPI application for backend service."""

import logging
import uuid
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import admin, factors, forecast, model, routes, telemetry
from app.config import settings
from app.core.exceptions import AppException, app_exception_handler, generic_exception_handler
from app.core.middleware import RequestIDMiddleware, LoggingMiddleware
from app.services.etl_client import ETLClient

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='{"ts": "%(asctime)s", "service": "backend", "level": "levelname", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    app.state.etl_client = ETLClient(base_url=settings.ETL_SERVICE_URL)
    logger.info("Backend service starting up")
    yield
    # Shutdown
    await app.state.etl_client.close()
    logger.info("Backend service shutting down")


app = FastAPI(
    title="Moscow Transport Hack - Backend API",
    description="Public API for passenger flow forecasting on Moscow tram routes",
    version="0.1.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

# Middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)


@app.get("/health/live")
async def health_live():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Readiness probe - checks ETL availability."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ETL_SERVICE_URL}/health/live")
            if response.status_code == 200:
                return {"status": "ready", "etl": "available"}
    except Exception:
        pass
    return ORJSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "not_ready", "etl": "unavailable"},
    )


# Include routers
app.include_router(routes.router, prefix="/api/v1", tags=["routes"])
app.include_router(forecast.router, prefix="/api/v1", tags=["forecast"])
app.include_router(factors.router, prefix="/api/v1", tags=["factors"])
app.include_router(model.router, prefix="/api/v1", tags=["model"])
app.include_router(telemetry.router, prefix="/api/v1", tags=["telemetry"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

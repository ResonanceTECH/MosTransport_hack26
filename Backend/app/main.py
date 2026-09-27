"""Backend API: the only service the browser talks to."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import forecast, meta, routes
from app.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler,
)
from app.core.logging import ObservabilityMiddleware, setup_logging
from app.services.etl_client import ETLClient
from app.services.forecast import ForecastService
from app.services.ml_client import MLClient

emitter = setup_logging("backend", settings.LOG_LEVEL)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.etl_client = ETLClient(settings.ETL_SERVICE_URL)
    app.state.ml_client = MLClient(settings.ML_SERVICE_URL)
    app.state.forecast_service = ForecastService(app.state.etl_client, app.state.ml_client)
    logger.info("backend ready: etl=%s ml=%s", settings.ETL_SERVICE_URL, settings.ML_SERVICE_URL)
    yield
    await app.state.etl_client.close()
    await app.state.ml_client.close()


app = FastAPI(
    title="Moscow Transport Hack - Backend API",
    description=("Public API for passenger flow forecasting on Moscow tram routes. "
                 "Reads features from the service database through ETL, calls the ML service using only "
                 "the fields of its /predict schema, and stores every run back in the database."),
    version="1.0.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(ObservabilityMiddleware, emitter=emitter)
origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

Instrumentator().instrument(app).expose(app)


@app.get("/health/live", tags=["health"])
async def health_live() -> dict:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def health_ready(request: Request) -> ORJSONResponse:
    components = {}
    for name, client in (("etl", request.app.state.etl_client), ("ml", request.app.state.ml_client)):
        try:
            await client.health()
            components[name] = "available"
        except Exception:
            components[name] = "unavailable"
    if all(value == "available" for value in components.values()):
        return {"status": "ready", **components}
    return ORJSONResponse(status_code=503, content={"status": "not_ready", **components})


app.include_router(routes.router, prefix="/api/v1", tags=["reference"])
app.include_router(forecast.router, prefix="/api/v1", tags=["forecast"])
app.include_router(meta.router, prefix="/api/v1", tags=["meta"])

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

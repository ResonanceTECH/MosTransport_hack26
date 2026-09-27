"""Forecast orchestration and reading API."""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query, Request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/forecast/precompute")
async def precompute_forecast(request: Request):
    """Trigger forecast precomputation for all routes and horizons."""
    logger.info("Starting forecast precomputation")
    # TODO: Implement actual precompute pipeline
    # 1. Prepare features for future dates
    # 2. Call ML service for batch prediction
    # 3. Save results to DB
    # 4. Refresh materialized views
    return {
        "status": "started",
        "message": "Пересчёт прогнозов начался",
    }


@router.get("/forecast")
async def get_forecast(
    request: Request,
    horizon: str = Query(..., description="Forecast horizon: day, month, year"),
    date_from: date = Query(..., description="Start date"),
    date_to: date = Query(..., description="End date"),
    route_id: Optional[str] = Query(None),
    stop_id: Optional[str] = Query(None),
    segment_from: Optional[str] = Query(None),
    segment_to: Optional[str] = Query(None),
    time_from: Optional[str] = Query(None),
    time_to: Optional[str] = Query(None),
    group_by: Optional[str] = Query(None),
):
    """Read precomputed forecasts from DB."""
    # TODO: Implement actual forecast reading from DB
    # For now return stub data
    return {
        "meta": {
            "horizon": horizon,
            "granularity": "hour" if horizon == "day" else "day" if horizon == "month" else "month",
            "model_version": "stub-0.1.0",
            "external_data_stale": False,
        },
        "items": [],
        "totals": {"value": 0, "value_adj": 0},
    }


@router.get("/forecast/map")
async def get_forecast_map(
    request: Request,
    horizon: str = Query(...),
    date: date = Query(...),
    hour: int = Query(..., ge=0, le=23),
):
    """Get forecast data for map coloring."""
    # TODO: Implement actual map data reading
    return {
        "date": date.isoformat(),
        "hour": hour,
        "stops": [],
    }

"""External data refresh API."""

import logging
from fastapi import APIRouter

from app.pipeline.external import run_external_pipeline

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/external/refresh")
async def refresh_external_data():
    """Manually trigger external data refresh."""
    logger.info("Starting external data refresh")
    results = await run_external_pipeline()
    return {
        "status": "completed",
        "results": results,
    }


@router.get("/external/status")
async def external_data_status():
    """Get external data freshness status."""
    # TODO: Query DB for actual status
    return {
        "sources": {
            "weather": {"last_update": None, "stale": True},
            "traffic": {"last_update": None, "stale": True},
            "calendar": {"last_update": None, "stale": True},
        }
    }

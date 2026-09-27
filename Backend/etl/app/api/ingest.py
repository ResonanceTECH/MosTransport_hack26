"""Dataset ingestion API."""

import logging
from fastapi import APIRouter, UploadFile, File

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ingest")
async def ingest_dataset(file: UploadFile = File(None)):
    """Ingest dataset.zip into database (idempotent)."""
    logger.info("Starting dataset ingestion")
    # TODO: Implement actual ingestion pipeline
    # 1. Extract zip
    # 2. Parse CSV files
    # 3. Normalize and clean
    # 4. Geocode validations
    # 5. Calculate target_hourly
    # 6. Write to DB via COPY
    return {
        "status": "started",
        "message": "Загрузка датасета началась. Проверьте статус через /etl/v1/ingest/status",
    }


@router.get("/ingest/status")
async def ingest_status():
    """Get ingestion status."""
    return {
        "status": "idle",
        "last_run": None,
        "rows_processed": 0,
        "rows_dropped": 0,
    }

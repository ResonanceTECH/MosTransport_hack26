"""Logging utilities for ETL."""

import json
import logging
import time
import uuid

logger = logging.getLogger(__name__)


def log_stage_start(stage: str, request_id: str = None):
    """Log stage start."""
    log_data = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "service": "etl",
        "level": "INFO",
        "request_id": request_id or str(uuid.uuid4()),
        "event": "etl_stage_start",
        "message": f"Stage {stage} started",
        "payload": {"stage": stage},
    }
    logger.info(json.dumps(log_data, ensure_ascii=False))


def log_stage_end(stage: str, rows_processed: int = 0, rows_dropped: int = 0, request_id: str = None):
    """Log stage end."""
    log_data = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "service": "etl",
        "level": "INFO",
        "request_id": request_id or str(uuid.uuid4()),
        "event": "etl_stage_done",
        "message": f"Stage {stage} completed",
        "payload": {
            "stage": stage,
            "rows_processed": rows_processed,
            "rows_dropped": rows_dropped,
        },
    }
    logger.info(json.dumps(log_data, ensure_ascii=False))


def log_external_api_error(source: str, error: str, request_id: str = None):
    """Log external API error."""
    log_data = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "service": "etl",
        "level": "ERROR",
        "request_id": request_id or str(uuid.uuid4()),
        "event": "external_api_error",
        "message": f"External API {source} error: {error}",
        "payload": {"source": source, "error": error},
    }
    logger.error(json.dumps(log_data, ensure_ascii=False))

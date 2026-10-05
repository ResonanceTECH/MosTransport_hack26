"""Telemetry API - receive frontend logs and metrics."""

import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List

router = APIRouter()
logger = logging.getLogger(__name__)


class TelemetryEvent(BaseModel):
    """Single telemetry event."""

    type: str
    name: str
    ts: str
    status: int = None
    path: str = None
    request_id: str = None
    message: str = None
    value: float = None
    payload: dict = None


class TelemetryBatch(BaseModel):
    """Batch of telemetry events."""

    events: List[TelemetryEvent]


@router.post("/telemetry", status_code=202)
async def receive_telemetry(batch: TelemetryBatch, request: Request):
    """Receive frontend telemetry events."""
    request_id = getattr(request.state, "request_id", None)

    for event in batch.events:
        log_data = {
            "ts": event.ts,
            "service": "frontend",
            "level": "INFO" if event.type != "error" else "ERROR",
            "request_id": event.request_id or request_id,
            "event": event.name,
            "message": event.message,
            "payload": event.payload,
        }
        if event.path:
            log_data["path"] = event.path
        if event.status:
            log_data["status"] = event.status
        if event.value is not None:
            log_data["value"] = event.value

        if event.type == "error":
            logger.error(log_data)
        else:
            logger.info(log_data)

    return {"status": "accepted"}

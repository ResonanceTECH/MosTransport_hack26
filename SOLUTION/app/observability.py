"""Prometheus metrics and Logs DB delivery for the prediction service.

Both are optional: if the dependencies or the logs database are absent the
service still starts and answers requests, it just stops reporting.
"""

from __future__ import annotations

import os
from typing import Any

_emitter = None
_initialised = False


def install_metrics(app) -> None:
    """Expose /metrics when prometheus-fastapi-instrumentator is installed."""
    try:
        from prometheus_fastapi_instrumentator import Instrumentator
    except ImportError:
        return
    Instrumentator().instrument(app).expose(app)


def _get_emitter():
    global _emitter, _initialised
    if _initialised:
        return _emitter
    _initialised = True
    if not os.getenv("LOGS_DB_HOST"):
        return None
    try:
        from mos_transport_common.emitter import LogEmitter
        from mos_transport_common.postgres import PostgresBatchSink
        from mos_transport_common.writer import AsyncBatchWriter

        _emitter = LogEmitter("ml", writer=AsyncBatchWriter(PostgresBatchSink.from_env(),
                                                            batch_size=50, flush_interval=0.5))
    except Exception:
        _emitter = None
    return _emitter


def log_to_database(
    *,
    request_id: str | None = None,
    event: str = "http_request",
    message: str | None = None,
    level: str = "INFO",
    method: str | None = None,
    path: str | None = None,
    status: int | None = None,
    latency_ms: float | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    emitter = _get_emitter()
    if emitter is None:
        return
    try:
        emitter.emit(
            "ERROR" if (status or 0) >= 500 else "WARNING" if (status or 0) >= 400 else level,
            event,
            message or f"{method} {path} -> {status}",
            request_id=request_id, method=method, path=path, status=status,
            latency_ms=latency_ms, payload=payload,
        )
    except Exception:
        # Observability must never break a prediction response.
        pass

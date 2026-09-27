"""Wiring of the shared log emitter into an ASGI service.

Every HTTP request gets a request ID, a stdout JSON line and a row in the Logs
DB. Delivery to PostgreSQL is asynchronous, so a slow or unavailable logs
database never delays an API response.
"""

from __future__ import annotations

import os
import time
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .emitter import LogEmitter
from .postgres import PostgresBatchSink
from .request_id import REQUEST_ID_HEADER, request_context, resolve_request_id
from .writer import AsyncBatchWriter

_QUIET_PATHS = {"/metrics", "/health/live", "/health/ready", "/favicon.ico"}


def build_emitter(service: str) -> tuple[LogEmitter, AsyncBatchWriter | None]:
    """Create the emitter, attaching the Logs DB sink when it is configured."""
    writer: AsyncBatchWriter | None = None
    if os.getenv("LOGS_DB_HOST"):
        try:
            writer = AsyncBatchWriter(PostgresBatchSink.from_env(), batch_size=50, flush_interval=0.5)
        except Exception:
            # Logging must never prevent a service from starting; stdout stays available.
            writer = None
    return LogEmitter(service, writer=writer), writer


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Assign X-Request-ID and record one log row per request."""

    def __init__(self, app, emitter: LogEmitter) -> None:
        super().__init__(app)
        self._emitter = emitter

    async def dispatch(self, request: Request, call_next):
        request_id = resolve_request_id(request.headers.get(REQUEST_ID_HEADER))
        started = time.perf_counter()
        with request_context(request_id):
            request.state.request_id = request_id
            request.state.emitter = self._emitter
            try:
                response = await call_next(request)
            except Exception as exc:
                self._emitter.emit(
                    "ERROR", "http_request_failed", f"{request.method} {request.url.path} raised {type(exc).__name__}",
                    request_id=request_id, method=request.method, path=str(request.url.path), status=500,
                    latency_ms=round((time.perf_counter() - started) * 1000, 3),
                )
                raise
            response.headers[REQUEST_ID_HEADER] = request_id
            if request.url.path not in _QUIET_PATHS:
                level = "ERROR" if response.status_code >= 500 else "WARNING" if response.status_code >= 400 else "INFO"
                self._emitter.emit(
                    level, "http_request", f"{request.method} {request.url.path} -> {response.status_code}",
                    request_id=request_id, user_id=getattr(request.state, "user_id", None),
                    method=request.method, path=str(request.url.path), status=response.status_code,
                    latency_ms=round((time.perf_counter() - started) * 1000, 3),
                )
            return response


def log_event(request: Request, level: str, event: str, message: str, **payload: Any) -> None:
    """Emit a domain event correlated with the current request."""
    emitter: LogEmitter | None = getattr(request.state, "emitter", None)
    if emitter is None:
        return
    emitter.emit(level, event, message,
                 request_id=getattr(request.state, "request_id", None),
                 user_id=getattr(request.state, "user_id", None),
                 method=request.method, path=str(request.url.path),
                 payload={k: v for k, v in payload.items() if v is not None})

"""Shared, framework-agnostic observability helpers for MosTransport."""

from .emitter import LogEmitter
from .postgres import PostgresBatchSink
from .request_id import REQUEST_ID_HEADER, get_request_id, new_request_id, request_context, resolve_request_id
from .writer import AsyncBatchWriter

__all__ = [
    "AsyncBatchWriter", "LogEmitter", "PostgresBatchSink", "REQUEST_ID_HEADER",
    "get_request_id", "new_request_id", "request_context", "resolve_request_id",
    "ObservabilityMiddleware", "build_emitter", "log_event",
]


def __getattr__(name: str):
    # service.py needs Starlette; import it lazily so the core package stays framework-free.
    if name in {"ObservabilityMiddleware", "build_emitter", "log_event"}:
        from . import service

        return getattr(service, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

"""Structured logging for the ETL service, backed by the shared emitter."""

from __future__ import annotations

import logging
import sys

from mos_transport_common.emitter import LogEmitter
from mos_transport_common.service import ObservabilityMiddleware, build_emitter, log_event

__all__ = ["ObservabilityMiddleware", "setup_logging", "get_emitter", "log_event"]

_emitter: LogEmitter | None = None


def setup_logging(service: str, level: str = "INFO") -> LogEmitter:
    """Configure stdout logging and the Logs DB emitter. Call before building the app."""
    global _emitter
    _emitter, _ = build_emitter(service)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        f'{{"ts":"%(asctime)s","service":"{service}","level":"%(levelname)s","message":"%(message)s"}}'))
    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO), handlers=[handler], force=True)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    return _emitter


def get_emitter() -> LogEmitter:
    if _emitter is None:
        raise RuntimeError("setup_logging must run before the emitter is used")
    return _emitter

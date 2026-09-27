"""Contract-checked structured JSON logging for application services."""

from __future__ import annotations

import json
import math
import sys
import threading
from datetime import datetime, timezone
from typing import Any, TextIO
from urllib.parse import urlsplit

from .request_id import get_request_id, resolve_request_id

_SERVICES = {"backend", "etl", "ml", "frontend"}
_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR"}
_stdout_lock = threading.Lock()


class LogEmitter:
    """Emit the shared Logs DB schema to JSON stdout and optional async writer."""

    def __init__(self, service: str, writer: Any | None = None, stdout: TextIO | None = None) -> None:
        if service not in _SERVICES:
            raise ValueError(f"service must be one of: {', '.join(sorted(_SERVICES))}")
        self.service = service
        self._writer = writer
        self._stdout = stdout or sys.stdout

    def emit(
        self,
        level: str,
        event: str,
        message: str,
        *,
        request_id: str | None = None,
        user_id: str | None = None,
        method: str | None = None,
        path: str | None = None,
        status: int | None = None,
        latency_ms: float | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Validate, write one JSON line, then enqueue without waiting for DB."""
        normalized_level = level.upper()
        if normalized_level not in _LEVELS:
            raise ValueError(f"level must be one of: {', '.join(sorted(_LEVELS))}")
        if not event or not message:
            raise ValueError("event and message are required")
        if status is not None and not 100 <= status <= 599:
            raise ValueError("status must be an HTTP status code from 100 to 599")
        if latency_ms is not None and (not math.isfinite(latency_ms) or latency_ms < 0):
            raise ValueError("latency_ms must be finite and non-negative")
        if payload is not None and not isinstance(payload, dict):
            raise ValueError("payload must be a JSON object")

        record: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "service": self.service,
            "level": normalized_level,
            "request_id": resolve_request_id(request_id) if request_id else get_request_id(),
            "user_id": user_id,
            "event": event,
            "message": message,
            "method": method.upper() if method else None,
            "path": self._safe_path(path),
            "status": status,
            "latency_ms": latency_ms,
            "payload": payload or {},
        }
        line = json.dumps(record, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        with _stdout_lock:
            self._stdout.write(line + "\n")
            self._stdout.flush()
        if self._writer is not None:
            self._writer.submit(record)
        return record

    @staticmethod
    def _safe_path(path: str | None) -> str | None:
        if path is None:
            return None
        # Drop query strings to avoid accidentally recording tokens or PII.
        parsed = urlsplit(path)
        return parsed.path or "/"

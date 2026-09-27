"""UUID request correlation without coupling the package to a web framework."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar, Token
from typing import Iterator
from uuid import UUID, uuid4

REQUEST_ID_HEADER = "X-Request-ID"
_request_id: ContextVar[str | None] = ContextVar("mos_transport_request_id", default=None)


def new_request_id() -> str:
    """Create a UUID suitable for the X-Request-ID contract."""
    return str(uuid4())


def resolve_request_id(value: str | None) -> str:
    """Preserve a valid UUID header; replace missing or invalid values."""
    if value:
        try:
            return str(UUID(value.strip()))
        except (ValueError, AttributeError):
            pass
    return new_request_id()


def get_request_id() -> str:
    """Return the active request UUID, creating one for non-request work."""
    current = _request_id.get()
    if current is None:
        current = new_request_id()
        _request_id.set(current)
    return current


@contextmanager
def request_context(value: str | None = None) -> Iterator[str]:
    """Set a valid request ID for the current context and restore it on exit."""
    request_id = resolve_request_id(value)
    token: Token[str | None] = _request_id.set(request_id)
    try:
        yield request_id
    finally:
        _request_id.reset(token)

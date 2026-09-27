"""Identity extraction for the demo authentication mode.

The frontend issues opaque `demo.<username>.<timestamp>` tokens. They carry no
signature, so they identify the caller for logging and role checks but they do
not authenticate it. Keycloak/JWKS validation is still to be implemented; do
not treat this module as a security boundary.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from fastapi import Request

from app.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException

DEMO_ROLES = {
    "demo_admin": ["dispatcher", "admin"],
    "demo_dispatcher": ["dispatcher"],
}


@dataclass
class Identity:
    user_id: str | None = None
    roles: list[str] = field(default_factory=list)

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles


def identify(request: Request) -> Identity:
    header = request.headers.get("Authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    if not token:
        if settings.REQUIRE_AUTH:
            raise UnauthorizedException()
        return Identity()
    if token.startswith("demo."):
        username = token.split(".")[1] if len(token.split(".")) > 1 else "demo"
        return Identity(user_id=username, roles=DEMO_ROLES.get(username, ["dispatcher"]))
    # Unknown token format: accept as an opaque identity unless auth is enforced.
    if settings.REQUIRE_AUTH:
        raise UnauthorizedException("Неизвестный формат токена")
    return Identity(user_id="external", roles=["dispatcher"])


def current_identity(request: Request) -> Identity:
    identity = identify(request)
    request.state.user_id = identity.user_id
    return identity


def require_admin(request: Request) -> Identity:
    identity = current_identity(request)
    if not identity.is_admin:
        raise ForbiddenException("Операция доступна только администратору")
    return identity

"""Error types and handlers.

The response body is flat (`message`, `code`, `request_id`) because that is what
the frontend API client parses.
"""

from __future__ import annotations

import logging

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse

logger = logging.getLogger("backend")


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundException(AppException):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__("not_found", message, status.HTTP_404_NOT_FOUND, details)


class ValidationException(AppException):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__("validation_error", message, status.HTTP_400_BAD_REQUEST, details)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Требуется авторизация"):
        super().__init__("unauthorized", message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Недостаточно прав"):
        super().__init__("forbidden", message, status.HTTP_403_FORBIDDEN)


class ServiceUnavailableException(AppException):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__("service_unavailable", message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


def _body(request: Request, code: str, message: str, details: dict | None = None) -> dict:
    return {
        "message": message,
        "code": code,
        "request_id": getattr(request.state, "request_id", None),
        "details": details or {},
    }


async def app_exception_handler(request: Request, exc: AppException) -> ORJSONResponse:
    return ORJSONResponse(status_code=exc.status_code, content=_body(request, exc.code, exc.message, exc.details))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> ORJSONResponse:
    errors = [{"loc": list(e.get("loc", []))[:4], "msg": str(e.get("msg", ""))} for e in exc.errors()[:20]]
    return ORJSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=_body(request, "validation_error", "Некорректные параметры запроса", {"errors": errors}),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return ORJSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_body(request, "internal_error", "Внутренняя ошибка сервиса. Попробуйте позже."),
    )

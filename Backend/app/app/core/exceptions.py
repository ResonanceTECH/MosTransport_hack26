"""Custom exceptions and error handlers."""

from fastapi import Request, status
from fastapi.responses import ORJSONResponse


class AppException(Exception):
    """Base application exception."""

    def __init__(self, code: str, message: str, status_code: int = 400, details: dict = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundException(AppException):
    """Resource not found."""

    def __init__(self, message: str, details: dict = None):
        super().__init__("NOT_FOUND", message, status.HTTP_404_NOT_FOUND, details)


class ValidationException(AppException):
    """Validation error."""

    def __init__(self, message: str, details: dict = None):
        super().__init__("VALIDATION_ERROR", message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class UnauthorizedException(AppException):
    """Unauthorized access."""

    def __init__(self, message: str = "Требуется авторизация"):
        super().__init__("UNAUTHORIZED", message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    """Forbidden access."""

    def __init__(self, message: str = "Недостаточно прав"):
        super().__init__("FORBIDDEN", message, status.HTTP_403_FORBIDDEN)


class ServiceUnavailableException(AppException):
    """External service unavailable."""

    def __init__(self, message: str):
        super().__init__("SERVICE_UNAVAILABLE", message, status.HTTP_503_SERVICE_UNAVAILABLE)


class ForecastNotReadyException(AppException):
    """Forecast not ready."""

    def __init__(self, message: str, details: dict = None):
        super().__init__("FORECAST_NOT_READY", message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


async def app_exception_handler(request: Request, exc: AppException):
    """Handle application exceptions."""
    return ORJSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    return ORJSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Внутренняя ошибка сервиса. Попробуйте позже.",
                "details": {},
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )

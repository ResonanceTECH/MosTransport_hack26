"""Shared request parsing for the forecast endpoints."""

from __future__ import annotations

from datetime import date as Date, timedelta

from fastapi import Request

from app.config import settings
from app.core.exceptions import ValidationException
from app.services.forecast import (
    ForecastQuery,
    ForecastService,
    parse_hour,
    parse_routes,
    validate_coefficients,
    validate_period,
)

_LIST_FILTERS = ("day_type", "precip_type", "weather_condition", "split")
_INT_LIST_FILTERS = ("day_of_week", "month")
_BOOL_FILTERS = ("is_holiday", "is_dayoff")
_FLOAT_FILTERS = ("temp_min", "temp_max", "precipitation_max", "wind_max", "congestion_min", "congestion_max")


def service(request: Request) -> ForecastService:
    return request.app.state.forecast_service


def _extra_filters(request: Request) -> dict:
    """Collect constraints on database-only columns from the query string."""
    params = request.query_params
    filters: dict = {}
    for name in _LIST_FILTERS:
        values = [v for v in params.getlist(name) if v]
        if len(values) == 1 and "," in values[0]:
            values = [part.strip() for part in values[0].split(",") if part.strip()]
        if values:
            filters[name] = values
    for name in _INT_LIST_FILTERS:
        raw = [v for v in params.getlist(name) if v]
        if len(raw) == 1 and "," in raw[0]:
            raw = [part.strip() for part in raw[0].split(",") if part.strip()]
        if raw:
            try:
                filters[name] = [int(v) for v in raw]
            except ValueError:
                raise ValidationException(f"Некорректное значение фильтра {name}")
    for name in _BOOL_FILTERS:
        value = params.get(name)
        if value is not None and value != "":
            filters[name] = value.lower() in ("1", "true", "yes")
    for name in _FLOAT_FILTERS:
        value = params.get(name)
        if value is not None and value != "":
            try:
                filters[name] = float(value)
            except ValueError:
                raise ValidationException(f"Некорректное значение фильтра {name}")
    return filters


async def build_query(request: Request, *, default_span_days: int = 0) -> ForecastQuery:
    params = request.query_params
    forecast_service = service(request)
    request_id = getattr(request.state, "request_id", None)

    available = {int(route["route_id"]) for route in await forecast_service.etl.routes(request_id)}
    routes = parse_routes(params.get("route"), available)

    horizon = params.get("horizon") or "day"
    date_param = params.get("date")
    date_from_param = params.get("date_from")
    date_to_param = params.get("date_to")

    try:
        if date_from_param and date_to_param:
            date_from, date_to = Date.fromisoformat(date_from_param), Date.fromisoformat(date_to_param)
        elif date_param:
            date_from = Date.fromisoformat(date_param)
            date_to = date_from + timedelta(days=default_span_days)
        else:
            coverage_from, coverage_to = await forecast_service.coverage(request_id)
            date_from = coverage_to - timedelta(days=default_span_days)
            date_to = coverage_to
            date_from = max(date_from, coverage_from)
    except ValueError:
        raise ValidationException("Некорректный формат даты, ожидается YYYY-MM-DD")

    validate_period(horizon, date_from, date_to)

    coefficients = {}
    for name in ("k_weather", "k_event", "k_season", "k_traffic"):
        value = params.get(name)
        if value not in (None, ""):
            try:
                coefficients[name] = float(value)
            except ValueError:
                raise ValidationException(f"Некорректное значение коэффициента {name}")
        else:
            coefficients[name] = settings.K_DEFAULT
    validate_coefficients(coefficients)

    return ForecastQuery(
        routes=routes,
        horizon=horizon,
        date_from=date_from,
        date_to=date_to,
        hour_from=parse_hour(params.get("from"), 0),
        hour_to=parse_hour(params.get("to"), 23),
        grouping=params.get("grouping") or "route",
        stop=params.get("stop") or None,
        hour=int(params["hour"]) if params.get("hour") not in (None, "") else None,
        coefficients=coefficients,
        filters=_extra_filters(request),
        model=params.get("model") or settings.DEFAULT_MODEL,
    )

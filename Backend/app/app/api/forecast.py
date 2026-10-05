"""Forecast API - main endpoint for passenger flow predictions."""

import io
import csv
from datetime import date, datetime
from typing import Optional

import xlsxwriter
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.exceptions import ValidationException

router = APIRouter()


def _validate_params(
    horizon: str,
    date_from: date,
    date_to: date,
    k_weather: Optional[float],
    k_event: Optional[float],
    k_season: Optional[float],
    k_traffic: Optional[float],
):
    """Validate forecast parameters."""
    if date_from > date_to:
        raise ValidationException("Дата начала периода не может быть позже даты окончания")

    # Check period length
    days = (date_to - date_from).days + 1
    if horizon == "day" and days > 31:
        raise ValidationException(
            "Период прогноза на день не может превышать 31 день. "
            "Сократите период или выберите горизонт 'месяц'"
        )
    if horizon == "month" and days > 366:
        raise ValidationException(
            "Период прогноза на месяц не может превышать 12 месяцев. "
            "Сократите период или выберите горизонт 'год'"
        )
    if horizon == "year" and days > 365 * 3:
        raise ValidationException("Период прогноза на год не может превышать 3 года")

    # Validate coefficients
    for name, value in [
        ("k_weather", k_weather),
        ("k_event", k_event),
        ("k_season", k_season),
        ("k_traffic", k_traffic),
    ]:
        if value is not None and not (settings.K_MIN <= value <= settings.K_MAX):
            raise ValidationException(
                f"Коэффициент {name} должен быть в диапазоне {settings.K_MIN}–{settings.K_MAX}"
            )


def _apply_coefficients(value: float, coefficients: dict) -> float:
    """Apply coefficients to a value."""
    result = value
    for k in ["k_weather", "k_event", "k_season", "k_traffic"]:
        result *= coefficients.get(k, 1.0)
    return round(result, 2)


@router.get("/forecast")
async def get_forecast(
    request: Request,
    horizon: str = Query(..., description="Forecast horizon: day, month, year"),
    date_from: date = Query(..., description="Start date"),
    date_to: date = Query(..., description="End date"),
    route_id: Optional[str] = Query(None, description="Route ID"),
    stop_id: Optional[str] = Query(None, description="Stop ID"),
    segment_from: Optional[str] = Query(None, description="Segment start stop"),
    segment_to: Optional[str] = Query(None, description="Segment end stop"),
    time_from: Optional[str] = Query(None, description="Start time (HH:MM)"),
    time_to: Optional[str] = Query(None, description="End time (HH:MM)"),
    group_by: Optional[str] = Query(None, description="Group by: route, stop, segment, none"),
    k_weather: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
    k_event: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
    k_season: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
    k_traffic: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
):
    """Get passenger flow forecast with coefficients applied."""
    # Validate
    _validate_params(horizon, date_from, date_to, k_weather, k_event, k_season, k_traffic)

    # Build coefficients
    coefficients = {
        "k_weather": k_weather or settings.K_DEFAULT,
        "k_event": k_event or settings.K_DEFAULT,
        "k_season": k_season or settings.K_DEFAULT,
        "k_traffic": k_traffic or settings.K_DEFAULT,
    }

    # Get data from ETL
    etl_client = request.app.state.etl_client
    params = {
        "horizon": horizon,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }
    if route_id:
        params["route_id"] = route_id
    if stop_id:
        params["stop_id"] = stop_id
    if segment_from:
        params["segment_from"] = segment_from
    if segment_to:
        params["segment_to"] = segment_to
    if time_from:
        params["time_from"] = time_from
    if time_to:
        params["time_to"] = time_to
    if group_by:
        params["group_by"] = group_by

    etl_data = await etl_client.get_forecast(request, params)

    # Apply coefficients
    items = []
    for item in etl_data.get("items", []):
        value = item.get("value", 0)
        items.append({
            **item,
            "value": value,
            "value_adj": _apply_coefficients(value, coefficients),
        })

    # Calculate totals
    total_value = sum(item["value"] for item in items)
    total_value_adj = sum(item["value_adj"] for item in items)

    return {
        "meta": {
            "horizon": horizon,
            "granularity": "hour" if horizon == "day" else "day" if horizon == "month" else "month",
            "model_version": etl_data.get("meta", {}).get("model_version", "unknown"),
            "coefficients": coefficients,
            "external_data_stale": etl_data.get("meta", {}).get("external_data_stale", False),
            "request_id": getattr(request.state, "request_id", None),
        },
        "items": items,
        "totals": {
            "value": round(total_value, 2),
            "value_adj": round(total_value_adj, 2),
        },
    }


@router.get("/forecast/map")
async def get_forecast_map(
    request: Request,
    horizon: str = Query(..., description="Forecast horizon"),
    date: date = Query(..., description="Date"),
    hour: int = Query(..., ge=0, le=23, description="Hour of day"),
):
    """Get forecast data for map coloring."""
    etl_client = request.app.state.etl_client
    params = {
        "horizon": horizon,
        "date": date.isoformat(),
        "hour": hour,
    }
    return await etl_client.get_forecast_map(request, params)


@router.get("/forecast/export")
async def export_forecast(
    request: Request,
    format: str = Query(..., regex="^(csv|xlsx)$", description="Export format"),
    horizon: str = Query(..., description="Forecast horizon"),
    date_from: date = Query(..., description="Start date"),
    date_to: date = Query(..., description="End date"),
    route_id: Optional[str] = Query(None),
    stop_id: Optional[str] = Query(None),
    segment_from: Optional[str] = Query(None),
    segment_to: Optional[str] = Query(None),
    time_from: Optional[str] = Query(None),
    time_to: Optional[str] = Query(None),
    group_by: Optional[str] = Query(None),
    k_weather: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
    k_event: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
    k_season: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
    k_traffic: Optional[float] = Query(None, ge=settings.K_MIN, le=settings.K_MAX),
):
    """Export forecast data as CSV or XLSX."""
    # Validate
    _validate_params(horizon, date_from, date_to, k_weather, k_event, k_season, k_traffic)

    # Build coefficients
    coefficients = {
        "k_weather": k_weather or settings.K_DEFAULT,
        "k_event": k_event or settings.K_DEFAULT,
        "k_season": k_season or settings.K_DEFAULT,
        "k_traffic": k_traffic or settings.K_DEFAULT,
    }

    # Get data from ETL
    etl_client = request.app.state.etl_client
    params = {
        "horizon": horizon,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }
    if route_id:
        params["route_id"] = route_id
    if stop_id:
        params["stop_id"] = stop_id
    if segment_from:
        params["segment_from"] = segment_from
    if segment_to:
        params["segment_to"] = segment_to
    if time_from:
        params["time_from"] = time_from
    if time_to:
        params["time_to"] = time_to
    if group_by:
        params["group_by"] = group_by

    etl_data = await etl_client.get_forecast(request, params)
    items = etl_data.get("items", [])

    if len(items) > settings.MAX_EXPORT_ROWS:
        raise ValidationException(
            f"Превышен лимит выгрузки ({settings.MAX_EXPORT_ROWS} строк). "
            "Уменьшите период или добавьте фильтры."
        )

    # Apply coefficients
    for item in items:
        value = item.get("value", 0)
        item["value_adj"] = _apply_coefficients(value, coefficients)

    if format == "csv":
        return _export_csv(items, coefficients, etl_data.get("meta", {}))
    else:
        return _export_xlsx(items, coefficients, etl_data.get("meta", {}))


def _export_csv(items: list, coefficients: dict, meta: dict):
    """Export as CSV with BOM for Excel."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["Дата и время", "Маршрут", "Остановка", "Прогноз", "Прогноз с коэффициентами"])

    for item in items:
        writer.writerow([
            item.get("ts", ""),
            item.get("route_id", ""),
            item.get("stop_id", ""),
            item.get("value", 0),
            item.get("value_adj", 0),
        ])

    # Add BOM for Excel
    content = "\ufeff" + output.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=forecast_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"},
    )


def _export_xlsx(items: list, coefficients: dict, meta: dict):
    """Export as XLSX with data and parameters sheets."""
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)

    # Data sheet
    worksheet = workbook.add_worksheet("Данные")
    headers = ["Дата и время", "Маршрут", "Остановка", "Прогноз", "Прогноз с коэффициентами"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)

    for row, item in enumerate(items, 1):
        worksheet.write(row, 0, item.get("ts", ""))
        worksheet.write(row, 1, item.get("route_id", ""))
        worksheet.write(row, 2, item.get("stop_id", ""))
        worksheet.write(row, 3, item.get("value", 0))
        worksheet.write(row, 4, item.get("value_adj", 0))

    # Parameters sheet
    params_sheet = workbook.add_worksheet("Параметры")
    params_data = [
        ["Параметр", "Значение"],
        ["Горизонт", meta.get("horizon", "")],
        ["Версия модели", meta.get("model_version", "")],
        ["Время выгрузки", datetime.now().isoformat()],
        ["k_weather", coefficients.get("k_weather", 1.0)],
        ["k_event", coefficients.get("k_event", 1.0)],
        ["k_season", coefficients.get("k_season", 1.0)],
        ["k_traffic", coefficients.get("k_traffic", 1.0)],
    ]
    for row, (param, value) in enumerate(params_data):
        params_sheet.write(row, 0, param)
        params_sheet.write(row, 1, value)

    workbook.close()
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=forecast_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"},
    )

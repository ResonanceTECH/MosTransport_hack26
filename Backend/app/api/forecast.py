"""Forecast endpoints consumed by the dashboard."""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import datetime

import xlsxwriter
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from app.api.deps import build_query, service
from app.config import settings
from app.core.auth import current_identity
from app.core.exceptions import ValidationException
from app.services import forecast as engine

router = APIRouter()


async def _stops_by_route(request: Request, routes: list[int]) -> dict[int, list[dict]]:
    etl = service(request).etl
    request_id = getattr(request.state, "request_id", None)
    stops = await etl.all_stops(request_id)
    grouped: dict[int, list[dict]] = defaultdict(list)
    for stop in stops:
        route_id = int(stop["route_id"])
        if route_id in routes:
            grouped[route_id].append(stop)
    for items in grouped.values():
        items.sort(key=lambda s: s["sequence"])
    return grouped


@router.get("/forecast")
async def get_forecast(request: Request):
    identity = current_identity(request)
    query = await build_query(request, default_span_days=0)
    result = await service(request).run(query, getattr(request.state, "request_id", None), identity.user_id)

    weight = 1.0
    if query.grouping == "stop" and query.stop:
        stops = await _stops_by_route(request, query.routes)
        for items in stops.values():
            for stop in items:
                if stop["stop_id"] == query.stop:
                    weight = float(stop["load_weight"])
                    break
    series = engine.time_series(result, query, weight)
    return {
        "series": series,
        "meta": result.meta(getattr(request.state, "request_id", None), query.horizon),
        "effect": engine.effect(series),
    }


@router.get("/forecast/map")
async def get_forecast_map(request: Request):
    identity = current_identity(request)
    query = await build_query(request, default_span_days=0)
    result = await service(request).run(query, getattr(request.state, "request_id", None), identity.user_id)

    date = engine.pick_date(result, request.query_params.get("date"))
    hour = query.hour if query.hour is not None else query.hour_from
    per_route: dict[int, float] = defaultdict(float)
    for row in result.predictions:
        if row["date"] == date and int(row["hour"]) == hour:
            per_route[int(row["route_id"])] += float(row["prediction"])

    stops_by_route = await _stops_by_route(request, query.routes)
    multiplier = query.multiplier
    entries = []
    for route_id, stops in stops_by_route.items():
        route_total = per_route.get(route_id, 0.0)
        for stop in stops:
            baseline = route_total * float(stop["load_weight"])
            entries.append({
                "stop_id": stop["stop_id"], "name": stop["name"],
                "lat": stop["lat"], "lon": stop["lon"], "sequence": stop["sequence"],
                "baseline_load": round(baseline, 1), "load": round(baseline * multiplier, 1),
            })
    peak = max((entry["load"] for entry in entries), default=0.0)
    for entry in entries:
        entry["level"] = engine.load_level(entry["load"], peak)

    series = engine.time_series(result, query)
    return {
        "stops": entries,
        "hour": hour,
        "meta": {**result.meta(getattr(request.state, "request_id", None), query.horizon), "date": date},
        "effect": engine.effect(series),
    }


@router.get("/forecast/heatmap")
async def get_forecast_heatmap(request: Request):
    identity = current_identity(request)
    query = await build_query(request, default_span_days=0)
    result = await service(request).run(query, getattr(request.state, "request_id", None), identity.user_id)

    date = engine.pick_date(result, request.query_params.get("date"))
    hourly = engine.route_hour_totals(result, date)
    stops_by_route = await _stops_by_route(request, query.routes)
    multiplier = query.multiplier

    per_route_hour: dict[tuple[int, int], float] = defaultdict(float)
    for row in result.predictions:
        if row["date"] == date:
            per_route_hour[(int(row["route_id"]), int(row["hour"]))] += float(row["prediction"])

    stops_out, cells = [], []
    for route_id, stops in stops_by_route.items():
        for stop in stops:
            stops_out.append({"id": stop["stop_id"], "name": stop["name"], "sequence": stop["sequence"]})
            for hour in range(query.hour_from, query.hour_to + 1):
                value = per_route_hour.get((route_id, hour), 0.0) * float(stop["load_weight"]) * multiplier
                cells.append({"stop_id": stop["stop_id"], "hour": hour, "value": round(value, 1)})

    return {
        "stops": stops_out,
        "cells": cells,
        "meta": {**result.meta(getattr(request.state, "request_id", None), query.horizon),
                 "date": date, "hours_total": len(hourly)},
    }


@router.get("/forecast/kpi")
async def get_forecast_kpi(request: Request):
    identity = current_identity(request)
    query = await build_query(request, default_span_days=0)
    result = await service(request).run(query, getattr(request.state, "request_id", None), identity.user_id)

    series = engine.time_series(result, query)
    multiplier = query.multiplier
    total = sum(point["adjusted"] for point in series)

    hourly: dict[int, float] = defaultdict(float)
    for row in result.predictions:
        if query.hour_from <= int(row["hour"]) <= query.hour_to:
            hourly[int(row["hour"])] += float(row["prediction"]) * multiplier
    peak_hour = max(hourly, key=hourly.get) if hourly else query.hour_from

    date = engine.pick_date(result, request.query_params.get("date"))
    per_route: dict[int, float] = defaultdict(float)
    for row in result.predictions:
        if row["date"] == date and int(row["hour"]) == peak_hour:
            per_route[int(row["route_id"])] += float(row["prediction"])
    stops_by_route = await _stops_by_route(request, query.routes)
    busiest = {"id": "", "name": "—", "load": 0.0}
    for route_id, stops in stops_by_route.items():
        for stop in stops:
            load = per_route.get(route_id, 0.0) * float(stop["load_weight"]) * multiplier
            if load > busiest["load"]:
                busiest = {"id": stop["stop_id"], "name": stop["name"], "load": round(load, 1)}

    baseline_total = sum(point["baseline"] for point in series)
    return {
        "total_passengers": round(total, 1),
        "peak_hour": int(peak_hour),
        "peak_hour_load": round(hourly.get(peak_hour, 0.0), 1),
        "busiest_stop": busiest,
        "delta_vs_baseline_percent": round((total - baseline_total) / baseline_total * 100.0, 2)
        if baseline_total else 0.0,
        "meta": result.meta(getattr(request.state, "request_id", None), query.horizon),
        "effect": engine.effect(series),
    }


@router.get("/forecast/export")
async def export_forecast(request: Request, format: str = Query("csv", pattern="^(csv|xlsx)$")):
    identity = current_identity(request)
    query = await build_query(request, default_span_days=0)
    result = await service(request).run(query, getattr(request.state, "request_id", None), identity.user_id)

    multiplier = query.multiplier
    rows = [
        {
            "ts": f"{row['date']}T{int(row['hour']):02d}:00:00",
            "route_id": row["route_id"],
            "value": round(float(row["prediction"]), 1),
            "value_adj": round(float(row["prediction"]) * multiplier, 1),
            "actual": result.actuals.get((int(row["route_id"]), row["date"], int(row["hour"]))),
        }
        for row in result.predictions
        if query.hour_from <= int(row["hour"]) <= query.hour_to
    ]
    if len(rows) > settings.MAX_EXPORT_ROWS:
        raise ValidationException(
            f"Превышен лимит выгрузки ({settings.MAX_EXPORT_ROWS} строк). Уменьшите период или добавьте фильтры.")
    rows.sort(key=lambda r: (r["ts"], r["route_id"]))

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if format == "csv":
        return _csv(rows, f"forecast_{stamp}.csv")
    return _xlsx(rows, query, result, f"forecast_{stamp}.xlsx")


_HEADERS = ["Дата и время", "Маршрут", "Прогноз", "Прогноз с коэффициентами", "Факт"]


def _csv(rows: list[dict], filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(_HEADERS)
    for row in rows:
        writer.writerow([row["ts"], row["route_id"], row["value"], row["value_adj"],
                         "" if row["actual"] is None else row["actual"]])
    content = "\ufeff" + buffer.getvalue()  # BOM so Excel detects UTF-8
    return StreamingResponse(iter([content]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


def _xlsx(rows: list[dict], query, result, filename: str) -> StreamingResponse:
    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
    sheet = workbook.add_worksheet("Данные")
    for column, header in enumerate(_HEADERS):
        sheet.write(0, column, header)
    for index, row in enumerate(rows, start=1):
        sheet.write(index, 0, row["ts"])
        sheet.write(index, 1, str(row["route_id"]))
        sheet.write(index, 2, row["value"])
        sheet.write(index, 3, row["value_adj"])
        if row["actual"] is not None:
            sheet.write(index, 4, row["actual"])

    params = workbook.add_worksheet("Параметры")
    rows_meta = [
        ("Параметр", "Значение"),
        ("Маршруты", ", ".join(str(r) for r in query.routes)),
        ("Горизонт", query.horizon),
        ("Период", f"{query.date_from} — {query.date_to}"),
        ("Часы", f"{query.hour_from}:00 — {query.hour_to}:00"),
        ("Модель", result.model),
        ("Идентификатор расчёта", result.run_id),
        ("Время выгрузки", engine.iso_now()),
        *[(name, value) for name, value in query.coefficients.items()],
        *[(f"Ограничение: {name}", str(value)) for name, value in query.filters.items()],
    ]
    for index, (name, value) in enumerate(rows_meta):
        params.write(index, 0, name)
        params.write(index, 1, value)
    workbook.close()
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

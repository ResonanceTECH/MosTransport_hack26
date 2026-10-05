"""Forecast endpoints consumed by the dashboard.

Every endpoint applies the same rules: coefficients scale the model output,
a selected stop or segment narrows route totals to its share, and stop load is
reported against a capacity derived from historical demand, so changing a
coefficient visibly changes values, percentages and load levels.
"""

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


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def _stops_by_route(request: Request, routes: list[int]) -> dict[int, list[dict]]:
    stops = await service(request).etl.all_stops(_request_id(request))
    grouped: dict[int, list[dict]] = defaultdict(list)
    for stop in stops:
        route_id = int(stop["route_id"])
        if route_id in routes:
            grouped[route_id].append(stop)
    for items in grouped.values():
        items.sort(key=lambda s: s["sequence"])
    return grouped


def _selected_stops(query: engine.ForecastQuery, stops_by_route: dict[int, list[dict]]) -> dict[int, list[dict]]:
    """Stops that belong to the current stop/segment selection (all stops when none)."""
    if query.stop:
        return {r: [s for s in stops if s["stop_id"] == query.stop] for r, stops in stops_by_route.items()}
    if query.segment_from and query.segment_to:
        selected = {}
        for route_id, stops in stops_by_route.items():
            sequence = {s["stop_id"]: s["sequence"] for s in stops}
            if query.segment_from in sequence and query.segment_to in sequence:
                low, high = sorted((sequence[query.segment_from], sequence[query.segment_to]))
                selected[route_id] = [s for s in stops if low <= s["sequence"] <= high]
            else:
                selected[route_id] = []
        return selected
    return stops_by_route


async def _prepare(request: Request):
    identity = current_identity(request)
    query = await build_query(request, default_span_days=0)
    forecast_service = service(request)
    result = await forecast_service.run(query, _request_id(request), identity.user_id)
    stops_by_route = await _stops_by_route(request, query.routes)
    weights = engine.selection_weights(query, stops_by_route)
    capacity = await forecast_service.capacity(_request_id(request))
    return query, result, stops_by_route, weights, capacity


def _route_hour(result: engine.ForecastResult, date: str) -> dict[tuple[int, int], float]:
    totals: dict[tuple[int, int], float] = defaultdict(float)
    for row in result.predictions:
        if row["date"] == date:
            totals[(int(row["route_id"]), int(row["hour"]))] += float(row["prediction"])
    return totals


@router.get("/forecast")
async def get_forecast(request: Request):
    query, result, _, weights, _ = await _prepare(request)
    series = engine.time_series(result, query, weights)
    return {
        "series": series,
        "meta": result.meta(_request_id(request), query.horizon),
        "effect": engine.effect(series),
    }


@router.get("/forecast/map")
async def get_forecast_map(request: Request):
    query, result, stops_by_route, weights, capacity = await _prepare(request)
    date = engine.pick_date(result, query, request.query_params.get("date"))
    hour = query.hour if query.hour is not None else query.hour_from
    route_hour = _route_hour(result, date)
    multiplier = query.multiplier

    entries = []
    for route_id, stops in stops_by_route.items():
        route_total = route_hour.get((route_id, hour), 0.0)
        for stop in stops:
            weight = float(stop["load_weight"])
            baseline = route_total * weight
            load = baseline * multiplier
            pct = engine.occupancy_pct(load, engine.stop_capacity(capacity.get(route_id, 0.0), len(stops_by_route.get(route_id, []))))
            entries.append({
                "stop_id": stop["stop_id"], "name": stop["name"],
                "lat": stop["lat"], "lon": stop["lon"], "sequence": stop["sequence"],
                "baseline_load": round(baseline, 1), "load": round(load, 1),
                "occupancy_pct": pct, "level": engine.load_level(pct),
            })

    series = engine.time_series(result, query, weights)
    return {
        "stops": entries,
        "hour": hour,
        "meta": {**result.meta(_request_id(request), query.horizon), "date": date},
        "effect": engine.effect(series),
    }


@router.get("/forecast/heatmap")
async def get_forecast_heatmap(request: Request):
    query, result, stops_by_route, _, capacity = await _prepare(request)
    date = engine.pick_date(result, query, request.query_params.get("date"))
    route_hour = _route_hour(result, date)
    multiplier = query.multiplier

    # A stops x hours matrix needs the whole route; only a segment narrows it.
    rows_source = stops_by_route if query.stop else _selected_stops(query, stops_by_route)
    stops_out, cells = [], []
    for route_id, stops in rows_source.items():
        for stop in stops:
            weight = float(stop["load_weight"])
            stops_out.append({"id": stop["stop_id"], "name": stop["name"], "sequence": stop["sequence"]})
            for hour in range(query.hour_from, query.hour_to + 1):
                value = route_hour.get((route_id, hour), 0.0) * weight * multiplier
                cells.append({
                    "stop_id": stop["stop_id"], "hour": hour, "value": round(value, 1),
                    "pct": engine.occupancy_pct(value, engine.stop_capacity(capacity.get(route_id, 0.0), len(stops_by_route.get(route_id, [])))),
                })

    return {
        "stops": stops_out,
        "cells": cells,
        "meta": {**result.meta(_request_id(request), query.horizon), "date": date},
    }


@router.get("/forecast/kpi")
async def get_forecast_kpi(request: Request):
    query, result, stops_by_route, weights, capacity = await _prepare(request)
    series = engine.time_series(result, query, weights)
    multiplier = query.multiplier
    total = sum(point["adjusted"] for point in series)
    baseline_total = sum(point["baseline"] for point in series)

    # Average day profile, so the peak hour is comparable across horizons.
    hourly: dict[int, float] = defaultdict(float)
    dates = set()
    for row in result.predictions:
        hour = int(row["hour"])
        if query.hour_from <= hour <= query.hour_to:
            weight = 1.0 if weights is None else weights.get(int(row["route_id"]), 0.0)
            hourly[hour] += float(row["prediction"]) * weight * multiplier
            dates.add(row["date"])
    days = max(len(dates), 1)
    peak_hour = max(hourly, key=hourly.get) if hourly else query.hour_from
    hours_in_range = query.hour_to - query.hour_from + 1

    date = engine.pick_date(result, query, request.query_params.get("date"))
    route_hour = _route_hour(result, date)
    busiest = {"id": "", "name": "—", "load": 0.0, "occupancy_pct": 0.0}
    for route_id, stops in _selected_stops(query, stops_by_route).items():
        for stop in stops:
            weight = float(stop["load_weight"])
            load = route_hour.get((route_id, peak_hour), 0.0) * weight * multiplier
            if load > busiest["load"]:
                busiest = {"id": stop["stop_id"], "name": stop["name"], "load": round(load, 1),
                           "occupancy_pct": engine.occupancy_pct(load, engine.stop_capacity(capacity.get(route_id, 0.0), len(stops_by_route.get(route_id, []))))}

    return {
        "total_passengers": round(total, 1),
        "peak_hour": int(peak_hour),
        "peak_hour_load": round(hourly.get(peak_hour, 0.0) / days, 1),
        "avg_hour_load": round(sum(hourly.values()) / days / max(hours_in_range, 1), 1),
        "busiest_stop": busiest,
        "delta_vs_baseline_percent": round((total - baseline_total) / baseline_total * 100.0, 2)
        if baseline_total else 0.0,
        "meta": result.meta(_request_id(request), query.horizon),
        "effect": engine.effect(series),
    }


@router.get("/forecast/export")
async def export_forecast(request: Request, format: str = Query("csv", pattern="^(csv|xlsx)$")):
    query, result, stops_by_route, weights, _ = await _prepare(request)
    multiplier = query.multiplier
    selection = None
    if query.stop:
        selection = next((s["name"] for stops in stops_by_route.values() for s in stops
                          if s["stop_id"] == query.stop), query.stop)
    elif query.segment_from and query.segment_to:
        selection = f"{query.segment_from} — {query.segment_to}"

    rows = []
    for row in result.predictions:
        if not query.hour_from <= int(row["hour"]) <= query.hour_to:
            continue
        route_id = int(row["route_id"])
        weight = 1.0 if weights is None else weights.get(route_id, 0.0)
        if weight == 0.0:
            continue
        fact = result.actuals.get((route_id, row["date"], int(row["hour"])))
        rows.append({
            "ts": f"{row['date']}T{int(row['hour']):02d}:00:00",
            "route_id": route_id,
            "selection": selection or "Весь маршрут",
            "value": round(float(row["prediction"]) * weight, 1),
            "value_adj": round(float(row["prediction"]) * weight * multiplier, 1),
            "actual": None if fact is None else round(fact * weight, 1),
        })
    if len(rows) > settings.MAX_EXPORT_ROWS:
        raise ValidationException(
            f"Превышен лимит выгрузки ({settings.MAX_EXPORT_ROWS} строк). Уменьшите период или добавьте фильтры.")
    rows.sort(key=lambda r: (r["ts"], r["route_id"]))

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if format == "csv":
        return _csv(rows, f"forecast_{stamp}.csv")
    return _xlsx(rows, query, result, f"forecast_{stamp}.xlsx")


_HEADERS = ["Дата и время", "Маршрут", "Остановка / участок", "Прогноз", "Прогноз с коэффициентами", "Факт"]


def _csv(rows: list[dict], filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(_HEADERS)
    for row in rows:
        writer.writerow([row["ts"], row["route_id"], row["selection"], row["value"], row["value_adj"],
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
        sheet.write(index, 2, row["selection"])
        sheet.write(index, 3, row["value"])
        sheet.write(index, 4, row["value_adj"])
        if row["actual"] is not None:
            sheet.write(index, 5, row["actual"])

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
    if result.coverage_note:
        rows_meta.append(("Примечание", result.coverage_note))
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

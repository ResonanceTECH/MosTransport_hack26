"""Feature rows for the ML service.

`rows` in every response contains exactly the 18 fields of the ML /predict
FeatureRow schema. Extra database columns are usable as filters (and are
reported by /filters/options) but are never part of `rows`.
"""

from __future__ import annotations

from datetime import date as Date

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.core import db
from app.pipeline.ingest import ML_SCHEMA_COLUMNS

router = APIRouter()

_SELECT = ", ".join(ML_SCHEMA_COLUMNS)


def _serialise(record, *, blank_boardings: bool) -> dict:
    row = {
        "route_id": int(record["route_id"]),
        "date": record["date"].isoformat(),
        "hour": int(record["hour"]),
        "boardings": None if blank_boardings or record["boardings"] is None else float(record["boardings"]),
        "day_type": record["day_type"],
        "is_dayoff": bool(record["is_dayoff"]),
        "is_short_day": bool(record["is_short_day"]),
        "is_holiday": bool(record["is_holiday"]),
        "is_transfer_workday": bool(record["is_transfer_workday"]),
        "precip_type": record["precip_type"],
    }
    for column in ("temperature_c", "precipitation_mm", "snowfall_cm", "wind_speed_ms",
                   "humidity_pct", "cloud_cover_pct", "traffic_congestion_index", "traffic_duration_s"):
        value = record[column]
        row[column] = None if value is None else float(value)
    return row


def _constraints(
    *, day_type: list[str] | None, precip_type: list[str] | None, weather_condition: list[str] | None,
    split: list[str] | None, day_of_week: list[int] | None, month: list[int] | None,
    is_holiday: bool | None, is_dayoff: bool | None,
    temp_min: float | None, temp_max: float | None,
    precipitation_max: float | None, wind_max: float | None,
    congestion_min: float | None, congestion_max: float | None,
    start: int,
) -> tuple[list[str], list]:
    """Build WHERE fragments for the database-only filter columns."""
    clauses: list[str] = []
    values: list = []
    index = start

    def add(fragment: str, value) -> None:
        nonlocal index
        clauses.append(fragment.format(i=index))
        values.append(value)
        index += 1

    if day_type:
        add("day_type = ANY(${i})", day_type)
    if precip_type:
        add("precip_type = ANY(${i})", precip_type)
    if weather_condition:
        add("weather_condition = ANY(${i})", weather_condition)
    if split:
        add("split = ANY(${i})", split)
    if day_of_week:
        add("day_of_week = ANY(${i})", day_of_week)
    if month:
        add("month = ANY(${i})", month)
    if is_holiday is not None:
        add("is_holiday = ${i}", is_holiday)
    if is_dayoff is not None:
        add("is_dayoff = ${i}", is_dayoff)
    if temp_min is not None:
        add("temperature_c >= ${i}", temp_min)
    if temp_max is not None:
        add("temperature_c <= ${i}", temp_max)
    if precipitation_max is not None:
        add("precipitation_mm <= ${i}", precipitation_max)
    if wind_max is not None:
        add("wind_speed_ms <= ${i}", wind_max)
    if congestion_min is not None:
        add("traffic_congestion_index >= ${i}", congestion_min)
    if congestion_max is not None:
        add("traffic_congestion_index <= ${i}", congestion_max)
    return clauses, values


@router.get("/features/history")
async def get_history(
    routes: str = Query(..., description="Comma-separated route ids"),
    date_from: Date = Query(...),
    date_to: Date = Query(..., description="Exclusive upper bound is not applied; use origin - 1 day"),
) -> dict:
    """History rows with known boardings, used by the model to build profiles."""
    route_ids = _parse_routes(routes)
    records = await db.pool().fetch(
        f"""SELECT {_SELECT} FROM features_hourly
            WHERE route_id = ANY($1) AND date BETWEEN $2 AND $3 AND boardings IS NOT NULL
            ORDER BY route_id, date, hour
            LIMIT {settings.MAX_FEATURE_ROWS}""",
        route_ids, date_from, date_to,
    )
    return {"rows": [_serialise(r, blank_boardings=False) for r in records], "count": len(records)}


@router.get("/features/window")
async def get_window(
    routes: str = Query(...),
    date_from: Date = Query(...),
    date_to: Date = Query(...),
    hour_from: int = Query(0, ge=0, le=23),
    hour_to: int = Query(23, ge=0, le=23),
    day_type: list[str] | None = Query(None),
    precip_type: list[str] | None = Query(None),
    weather_condition: list[str] | None = Query(None),
    split: list[str] | None = Query(None),
    day_of_week: list[int] | None = Query(None),
    month: list[int] | None = Query(None),
    is_holiday: bool | None = Query(None),
    is_dayoff: bool | None = Query(None),
    temp_min: float | None = Query(None),
    temp_max: float | None = Query(None),
    precipitation_max: float | None = Query(None),
    wind_max: float | None = Query(None),
    congestion_min: float | None = Query(None),
    congestion_max: float | None = Query(None),
) -> dict:
    """Rows to forecast.

    `boardings` is blanked so the model predicts every returned hour. Known
    values, when the period lies in the past, are returned separately in
    `actuals` so the UI can compare forecast against fact.
    """
    route_ids = _parse_routes(routes)
    if hour_from > hour_to:
        raise HTTPException(status_code=422, detail="hour_from must not exceed hour_to")

    clauses, values = _constraints(
        day_type=day_type, precip_type=precip_type, weather_condition=weather_condition, split=split,
        day_of_week=day_of_week, month=month, is_holiday=is_holiday, is_dayoff=is_dayoff,
        temp_min=temp_min, temp_max=temp_max, precipitation_max=precipitation_max, wind_max=wind_max,
        congestion_min=congestion_min, congestion_max=congestion_max, start=6,
    )
    where = " AND ".join(["route_id = ANY($1)", "date BETWEEN $2 AND $3", "hour BETWEEN $4 AND $5", *clauses])
    records = await db.pool().fetch(
        f"""SELECT {_SELECT} FROM features_hourly
            WHERE {where} ORDER BY route_id, date, hour LIMIT {settings.MAX_FEATURE_ROWS}""",
        route_ids, date_from, date_to, hour_from, hour_to, *values,
    )
    total = await db.pool().fetchval(
        """SELECT count(*) FROM features_hourly
           WHERE route_id = ANY($1) AND date BETWEEN $2 AND $3 AND hour BETWEEN $4 AND $5""",
        route_ids, date_from, date_to, hour_from, hour_to,
    )
    actuals = [
        {"route_id": int(r["route_id"]), "date": r["date"].isoformat(), "hour": int(r["hour"]),
         "boardings": float(r["boardings"])}
        for r in records if r["boardings"] is not None
    ]
    return {
        "rows": [_serialise(r, blank_boardings=True) for r in records],
        "actuals": actuals,
        "count": len(records),
        "available": int(total or 0),
        "excluded_by_filters": int(total or 0) - len(records),
    }


@router.get("/filters/options")
async def filter_options() -> dict:
    """Distinct values and ranges of the database-only columns, for UI constraints."""
    pool = db.pool()
    categorical = {}
    for column in ("day_type", "precip_type", "weather_condition", "split"):
        rows = await pool.fetch(
            f"SELECT DISTINCT {column} AS value FROM features_hourly "
            f"WHERE {column} IS NOT NULL ORDER BY 1")
        categorical[column] = [r["value"] for r in rows]
    ranges = await pool.fetchrow(
        """SELECT min(temperature_c) AS temp_min, max(temperature_c) AS temp_max,
                  min(precipitation_mm) AS precip_min, max(precipitation_mm) AS precip_max,
                  min(wind_speed_ms) AS wind_min, max(wind_speed_ms) AS wind_max,
                  min(traffic_congestion_index) AS congestion_min,
                  max(traffic_congestion_index) AS congestion_max,
                  min(date) AS date_min, max(date) AS date_max
           FROM features_hourly""")
    return {
        "categorical": categorical,
        "numeric": {
            "temperature_c": {"min": _float(ranges["temp_min"]), "max": _float(ranges["temp_max"])},
            "precipitation_mm": {"min": _float(ranges["precip_min"]), "max": _float(ranges["precip_max"])},
            "wind_speed_ms": {"min": _float(ranges["wind_min"]), "max": _float(ranges["wind_max"])},
            "traffic_congestion_index": {"min": _float(ranges["congestion_min"]),
                                         "max": _float(ranges["congestion_max"])},
        },
        "dates": {"min": ranges["date_min"].isoformat() if ranges["date_min"] else None,
                  "max": ranges["date_max"].isoformat() if ranges["date_max"] else None},
        "ml_schema_fields": list(ML_SCHEMA_COLUMNS),
    }


@router.get("/coverage")
async def coverage() -> dict:
    rows = await db.pool().fetch(
        """SELECT route_id, split, date_from, date_to, rows_total, rows_to_forecast, boardings_total
           FROM v_data_coverage ORDER BY route_id, split""")
    return {"coverage": [
        {"route_id": str(r["route_id"]), "split": r["split"],
         "date_from": r["date_from"].isoformat(), "date_to": r["date_to"].isoformat(),
         "rows_total": int(r["rows_total"]), "rows_to_forecast": int(r["rows_to_forecast"]),
         "boardings_total": _float(r["boardings_total"])}
        for r in rows
    ]}


def _parse_routes(value: str) -> list[int]:
    try:
        ids = [int(part.strip()) for part in value.split(",") if part.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="routes must be a comma-separated list of integers")
    if not ids:
        raise HTTPException(status_code=422, detail="routes must contain at least one route id")
    return ids


def _float(value) -> float | None:
    return None if value is None else float(value)

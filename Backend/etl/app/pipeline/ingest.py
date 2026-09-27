"""Load the hourly dataset and the reference network into the service database."""

from __future__ import annotations

import logging
from pathlib import Path

import asyncpg
import pandas as pd

from app.pipeline import reference

logger = logging.getLogger(__name__)

# Exactly the 18 fields of the ML /predict FeatureRow schema.
ML_SCHEMA_COLUMNS = (
    "route_id", "date", "hour", "boardings", "day_type",
    "is_dayoff", "is_short_day", "is_holiday", "is_transfer_workday",
    "temperature_c", "precipitation_mm", "snowfall_cm", "precip_type",
    "wind_speed_ms", "humidity_pct", "cloud_cover_pct",
    "traffic_congestion_index", "traffic_duration_s",
)

# Database-only columns: available for UI filters, never forwarded to the model.
EXTRA_COLUMNS = (
    "ts_hour", "split", "day_of_week", "month", "feels_like_c",
    "weather_condition", "weather_source", "weather_is_forecast",
    "is_saturday_profile", "is_sunday_profile", "is_rain", "is_snow",
)

INSERT_COLUMNS = ML_SCHEMA_COLUMNS + EXTRA_COLUMNS
_BOOLEAN_COLUMNS = ("is_dayoff", "is_short_day", "is_holiday", "is_transfer_workday", "weather_is_forecast")
_FLOAT_COLUMNS = (
    "boardings", "temperature_c", "precipitation_mm", "snowfall_cm", "wind_speed_ms",
    "humidity_pct", "cloud_cover_pct", "traffic_congestion_index", "traffic_duration_s",
    "feels_like_c", "is_saturday_profile", "is_sunday_profile", "is_rain", "is_snow",
)


async def load_reference(connection: asyncpg.Connection) -> None:
    await connection.executemany(
        """INSERT INTO routes (route_id, number, name, color) VALUES ($1, $2, $3, $4)
           ON CONFLICT (route_id) DO UPDATE SET number = EXCLUDED.number,
               name = EXCLUDED.name, color = EXCLUDED.color""",
        [(r["route_id"], r["number"], r["name"], r["color"]) for r in reference.routes()],
    )
    await connection.executemany(
        """INSERT INTO stops (stop_id, route_id, name, latitude, longitude, sequence, load_weight)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (stop_id) DO UPDATE SET name = EXCLUDED.name, latitude = EXCLUDED.latitude,
               longitude = EXCLUDED.longitude, sequence = EXCLUDED.sequence,
               load_weight = EXCLUDED.load_weight""",
        [(s["stop_id"], s["route_id"], s["name"], s["latitude"], s["longitude"], s["sequence"], s["load_weight"])
         for s in reference.stops()],
    )
    await connection.executemany(
        """INSERT INTO route_geometry (route_id, geometry) VALUES ($1, $2)
           ON CONFLICT (route_id) DO UPDATE SET geometry = EXCLUDED.geometry""",
        [(g["route_id"], g["geometry"]) for g in reference.geometries()],
    )
    logger.info("reference loaded: %s routes, %s stops", len(reference.routes()), len(reference.stops()))


def _prepare(frame: pd.DataFrame) -> list[tuple]:
    df = frame.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["ts_hour"] = pd.to_datetime(df["ts_hour"], utc=True, format="ISO8601")
    for column in _BOOLEAN_COLUMNS:
        df[column] = df[column].astype("float64").fillna(0.0).astype(bool)
    for column in _FLOAT_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce").astype("float64")
    for column in ("route_id", "hour", "day_of_week", "month"):
        df[column] = df[column].astype("int64")
    for column in ("day_type", "precip_type", "split", "weather_condition", "weather_source"):
        df[column] = df[column].astype("string")

    df = df[list(INSERT_COLUMNS)]
    records = df.to_dict("records")
    return [
        tuple(None if (value is not None and value != value) else value  # NaN -> NULL
              for value in (record[column] for column in INSERT_COLUMNS))
        for record in records
    ]


async def load_dataset(connection: asyncpg.Connection, path: Path) -> int:
    frame = pd.read_parquet(path)
    missing = set(INSERT_COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError(f"dataset is missing columns: {sorted(missing)}")
    rows = _prepare(frame)
    async with connection.transaction():
        await connection.execute("TRUNCATE public.features_hourly")
        await connection.copy_records_to_table("features_hourly", records=rows, columns=list(INSERT_COLUMNS))
    logger.info("features_hourly loaded: %s rows from %s", len(rows), path)
    return len(rows)


async def run(pool, dataset_path: str, force: bool = False) -> dict:
    """Populate reference tables and features_hourly when the database is empty."""
    path = Path(dataset_path)
    async with pool.acquire() as connection:
        await load_reference(connection)
        existing = await connection.fetchval("SELECT count(*) FROM public.features_hourly")
        if existing and not force:
            logger.info("features_hourly already has %s rows, skipping ingest", existing)
            return {"status": "skipped", "rows": int(existing)}
        if not path.exists():
            logger.error("dataset not found at %s", path)
            return {"status": "failed", "rows": 0, "reason": f"dataset not found: {path}"}
        count = await load_dataset(connection, path)
        return {"status": "completed", "rows": count}

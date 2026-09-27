"""External data loading pipeline.

Fetches weather, calendar, traffic data and saves to DB.
"""

import logging
from datetime import date, datetime
from typing import Optional

import pandas as pd

from app.sources.weather import fetch_weather_history_openmeteo, fetch_weather_forecast_yandex
from app.sources.calendar import generate_calendar_2026, generate_calendar_2027
from app.core.db import get_connection

logger = logging.getLogger(__name__)


async def load_weather_history() -> dict:
    """Load historical weather data into ext_weather_hourly."""
    logger.info("Loading weather history")

    df = await fetch_weather_history_openmeteo(
        start_date="2025-01-01",
        end_date="2025-10-31",
    )

    if df is None or len(df) == 0:
        logger.warning("No weather history data fetched")
        return {"status": "no_data", "rows": 0}

    # Save to DB
    rows_saved = 0
    async with get_connection() as conn:
        for _, row in df.iterrows():
            await conn.execute(
                """
                INSERT INTO ext_weather_hourly (ts_hour, temperature, precipitation, snow, wind_speed, source)
                VALUES ($1, $2, $3, $4, $5, 'open-meteo')
                ON CONFLICT (ts_hour, source) DO UPDATE SET
                    temperature = EXCLUDED.temperature,
                    precipitation = EXCLUDED.precipitation,
                    snow = EXCLUDED.snow,
                    wind_speed = EXCLUDED.wind_speed,
                    fetched_at = NOW()
                """,
                row["ts_hour"].to_pydatetime(),
                row["temperature"],
                row["precipitation"],
                row["snow"],
                row["wind_speed"],
            )
            rows_saved += 1

    logger.info(f"Saved {rows_saved} weather history records")
    return {"status": "ok", "rows": rows_saved}


async def load_weather_forecast() -> dict:
    """Load weather forecast into ext_weather_hourly."""
    logger.info("Loading weather forecast")

    df = await fetch_weather_forecast_yandex(days=7)

    if df is None or len(df) == 0:
        logger.warning("No weather forecast data fetched")
        return {"status": "no_data", "rows": 0}

    rows_saved = 0
    async with get_connection() as conn:
        for _, row in df.iterrows():
            await conn.execute(
                """
                INSERT INTO ext_weather_hourly (ts_hour, temperature, precipitation, snow, wind_speed, source)
                VALUES ($1, $2, $3, $4, $5, 'open-meteo-forecast')
                ON CONFLICT (ts_hour, source) DO UPDATE SET
                    temperature = EXCLUDED.temperature,
                    precipitation = EXCLUDED.precipitation,
                    snow = EXCLUDED.snow,
                    wind_speed = EXCLUDED.wind_speed,
                    fetched_at = NOW()
                """,
                row["ts_hour"].to_pydatetime(),
                row["temperature"],
                row["precipitation"],
                row["snow"],
                row["wind_speed"],
            )
            rows_saved += 1

    logger.info(f"Saved {rows_saved} weather forecast records")
    return {"status": "ok", "rows": rows_saved}


async def load_calendar() -> dict:
    """Load production calendar into ext_calendar_days."""
    logger.info("Loading production calendar")

    rows_saved = 0
    async with get_connection() as conn:
        for year in [2026, 2027]:
            if year == 2026:
                calendar = generate_calendar_2026()
            else:
                calendar = generate_calendar_2027()

            for day in calendar:
                await conn.execute(
                    """
                    INSERT INTO ext_calendar_days (date, day_type, is_working, holiday_name, is_school_holiday, source)
                    VALUES ($1, $2, $3, $4, $5, 'isdayoff')
                    ON CONFLICT (date) DO UPDATE SET
                        day_type = EXCLUDED.day_type,
                        is_working = EXCLUDED.is_working,
                        holiday_name = EXCLUDED.holiday_name,
                        is_school_holiday = EXCLUDED.is_school_holiday,
                        fetched_at = NOW()
                    """,
                    datetime.strptime(day["date"], "%Y-%m-%d").date(),
                    day["day_type"],
                    day["is_working"],
                    day.get("holiday_name"),
                    day["is_school_holiday"],
                )
                rows_saved += 1

    logger.info(f"Saved {rows_saved} calendar days")
    return {"status": "ok", "rows": rows_saved}


async def load_traffic() -> dict:
    """Load traffic data into ext_traffic_hourly.

    Note: 2GIS API does not provide historical traffic data.
    This is a placeholder for future integration.
    """
    logger.info("Traffic data loading not implemented (2GIS API limitation)")
    return {"status": "not_implemented", "rows": 0}


async def run_external_pipeline() -> dict:
    """Run full external data loading pipeline."""
    logger.info("Starting external data pipeline")

    results = {
        "weather_history": await load_weather_history(),
        "weather_forecast": await load_weather_forecast(),
        "calendar": await load_calendar(),
        "traffic": await load_traffic(),
    }

    logger.info("External data pipeline completed")
    return results

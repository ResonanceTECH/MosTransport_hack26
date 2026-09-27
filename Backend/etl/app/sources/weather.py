"""Weather data integration.

Uses:
- Yandex Weather API for forecast (works, has API key)
- Open-Meteo Historical API for training data (free, no API key)
"""

import logging
from typing import Optional

import httpx
import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

YANDEX_WEATHER_URL = "https://api.weather.yandex.ru/v2/forecast"
OPEN_METEO_HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive"


async def fetch_weather_forecast_yandex(
    lat: float = 55.7558,
    lon: float = 37.6173,
    days: int = 7,
) -> Optional[pd.DataFrame]:
    """Fetch weather forecast from Yandex Weather API.

    Returns DataFrame with columns: ts_hour, temperature, precipitation, snow, wind_speed
    """
    if not settings.YANDEX_WEATHER_API_KEY:
        logger.warning("YANDEX_WEATHER_API_KEY not set, skipping weather forecast")
        return None

    headers = {"X-Yandex-API-Key": settings.YANDEX_WEATHER_API_KEY}
    params = {"lat": lat, "lon": lon, "limit": days, "hours": True, "extra": True}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(YANDEX_WEATHER_URL, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

        # Parse hourly forecast
        forecasts = data.get("forecasts", [])
        records = []

        for forecast in forecasts:
            date = forecast.get("date")
            for hour_data in forecast.get("hours", []):
                hour = hour_data.get("hour")
                temp = hour_data.get("temp")
                condition = hour_data.get("condition")
                prec_mm = hour_data.get("prec_mm", 0)
                wind_speed = hour_data.get("wind_speed")

                # Map condition to snow
                snow = condition in ["snow", "snowstorm", "sleet"]

                records.append({
                    "ts_hour": f"{date} {int(hour):02d}:00:00",
                    "temperature": temp,
                    "precipitation": prec_mm,
                    "snow": snow,
                    "wind_speed": wind_speed,
                })

        df = pd.DataFrame(records)
        if len(df) > 0:
            df["ts_hour"] = pd.to_datetime(df["ts_hour"])

        logger.info(f"Fetched {len(df)} hourly forecast records from Yandex Weather")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch weather forecast: {e}")
        return None


async def fetch_weather_history_openmeteo(
    lat: float = 55.7558,
    lon: float = 37.6173,
    start_date: str = "2025-01-01",
    end_date: str = "2025-10-31",
) -> Optional[pd.DataFrame]:
    """Fetch historical weather from Open-Meteo (free, no API key needed).

    Returns DataFrame with columns: ts_hour, temperature, precipitation, snow, wind_speed
    """
    logger.info(f"Fetching historical weather from Open-Meteo: {start_date} to {end_date}")

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "timezone": "Europe/Moscow",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(OPEN_METEO_HISTORICAL_URL, params=params)
            response.raise_for_status()
            data = response.json()

        hourly = data["hourly"]
        df = pd.DataFrame({
            "ts_hour": pd.to_datetime(hourly["time"]),
            "temperature": hourly["temperature_2m"],
            "precipitation": hourly["precipitation"],
            "weather_code": hourly["weather_code"],
            "wind_speed": hourly["wind_speed_10m"],
        })

        # Derive snow from weather_code (51-67, 71-77, 85-86 are snow codes)
        df["snow"] = df["weather_code"].isin([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 85, 86])

        logger.info(f"Fetched {len(df)} hourly weather records")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch historical weather: {e}")
        return None


# Backward compatibility aliases
async def fetch_weather_forecast(**kwargs):
    """Fetch weather forecast (uses Yandex Weather)."""
    return await fetch_weather_forecast_yandex(**kwargs)


async def fetch_weather_history(**kwargs):
    """Fetch weather history (uses Open-Meteo)."""
    return await fetch_weather_history_openmeteo(**kwargs)

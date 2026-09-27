import numpy as np
import pandas as pd
import pytest

import data


def synthetic_raw(routes=(1, 5), start="2025-01-01", end="2025-04-30", seed=0) -> pd.DataFrame:
    """ETL-like hourly grid: daily/weekly seasonality, route 5 without boardings (as in the real data)."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range(start, end)
    grid = pd.MultiIndex.from_product([routes, dates, range(24)], names=["route_id", "date", "hour"]).to_frame(index=False)
    dow = grid["date"].dt.dayofweek
    weekend = dow >= 5
    profile = np.exp(-((grid["hour"] - 8) ** 2) / 8) + 0.8 * np.exp(-((grid["hour"] - 18) ** 2) / 8)
    level = np.where(grid["route_id"] == 5, 0, 1000) * np.where(weekend, 0.5, 1.0)
    grid["boardings"] = np.rint(level * profile * rng.uniform(0.9, 1.1, len(grid)))
    grid["day_type"] = np.select([~weekend, dow == 5], ["workday", "saturday"], "sunday")
    grid["is_dayoff"] = weekend
    grid["is_short_day"] = False
    grid["is_holiday"] = False
    grid["is_transfer_workday"] = False
    grid["weather_is_forecast"] = False
    grid["precip_type"] = rng.choice(["none", "rain", "snow"], len(grid))
    for column in ["temperature_c", "precipitation_mm", "snowfall_cm", "wind_speed_ms", "humidity_pct", "cloud_cover_pct"]:
        grid[column] = rng.normal(size=len(grid))
    grid["traffic_congestion_index"] = 1 + 0.2 * profile
    grid["traffic_duration_s"] = 1000 * grid["traffic_congestion_index"]
    return grid


@pytest.fixture(scope="session")
def dataset() -> pd.DataFrame:
    return data.normalize(synthetic_raw())

"""Feature engineering for ML model.

This module prepares features_hourly table by joining target data with
external data sources (weather, traffic, calendar, events).
"""

import logging
from datetime import date, timedelta
from typing import Dict, List

import polars as pl

from app.sources.calendar import get_day_type, is_school_holiday

logger = logging.getLogger(__name__)


def prepare_features(
    target_hourly: pl.DataFrame,
    weather_data: pl.DataFrame = None,
    traffic_data: pl.DataFrame = None,
    calendar_data: pl.DataFrame = None,
) -> pl.DataFrame:
    """Prepare features for ML model.

    Joins target data with external sources by ts_hour.
    No future data leakage - only uses data available at prediction time.
    """
    logger.info("Preparing features for ML model")

    # Start with target
    features = target_hourly.clone()

    # Add calendar features
    features = features.with_columns([
        pl.col("date").dt.weekday().alias("day_of_week"),
        pl.col("date").dt.month().alias("month"),
        pl.col("date").dt.year().alias("year"),
    ])

    # Add day type from calendar
    # TODO: Join with calendar_data if available

    # Add weather features if available
    if weather_data is not None and len(weather_data) > 0:
        features = features.join(
            weather_data,
            on=["date", "hour"],
            how="left",
        )

    # Add traffic features if available
    if traffic_data is not None and len(traffic_data) > 0:
        features = features.join(
            traffic_data,
            on=["date", "hour"],
            how="left",
        )

    logger.info(f"Features prepared: {len(features)} rows, {len(features.columns)} columns")
    return features


def export_features_to_parquet(features: pl.DataFrame, output_path: str):
    """Export features to Parquet for ML training."""
    features.write_parquet(output_path)
    logger.info(f"Features exported to {output_path}")


def prepare_future_features(
    routes: List[str],
    start_date: date,
    end_date: date,
    weather_forecast: pl.DataFrame = None,
) -> pl.DataFrame:
    """Prepare features for future dates (for prediction).

    Creates a grid of route × date × hour with calendar features
    and weather forecast if available.
    """
    logger.info(f"Preparing future features from {start_date} to {end_date}")

    # Create date range
    date_range = pl.date_range(start_date, end_date, interval="1d", eager=True)

    # Create hour range
    hours = list(range(24))

    # Create grid: route × date × hour
    grid = (
        pl.DataFrame({"route_id": routes})
        .join(date_range.to_frame("date"), how="cross")
        .join(pl.DataFrame({"hour": hours}), how="cross")
    )

    # Add calendar features
    grid = grid.with_columns([
        pl.col("date").dt.weekday().alias("day_of_week"),
        pl.col("date").dt.month().alias("month"),
        pl.col("date").dt.year().alias("year"),
    ])

    # Add weather forecast if available
    if weather_forecast is not None and len(weather_forecast) > 0:
        grid = grid.join(
            weather_forecast,
            on=["date", "hour"],
            how="left",
        )

    logger.info(f"Future features prepared: {len(grid)} rows")
    return grid

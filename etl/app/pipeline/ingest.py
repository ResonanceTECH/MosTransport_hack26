"""Dataset ingestion and normalization pipeline."""

import logging
import zipfile
from io import StringIO
from pathlib import Path
from typing import Dict, List, Tuple

import polars as pl

from app.config import settings
from app.core.logging import log_stage_start, log_stage_end

logger = logging.getLogger(__name__)

# Expected routes in dataset
EXPECTED_ROUTES = ["1", "5", "7", "11", "12", "17", "25", "26", "28", "50"]


def extract_dataset(zip_path: str) -> Dict[str, pl.DataFrame]:
    """Extract and parse CSV files from dataset.zip."""
    log_stage_start("extract")
    data = {}

    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.endswith(".csv"):
                logger.info(f"Extracting {name}")
                with zf.open(name) as f:
                    content = f.read().decode("utf-8")
                    # Parse with polars
                    df = pl.read_csv(StringIO(content), separator=";")
                    data[name] = df

    log_stage_end("extract", rows_processed=sum(len(df) for df in data.values()))
    return data


def normalize_validations(df: pl.DataFrame) -> pl.DataFrame:
    """Normalize and clean validations data."""
    log_stage_start("normalize_validations")

    initial_count = len(df)

    # Filter successful validations only
    df = df.filter(pl.col("validation_result") == 1)

    # Parse datetime
    df = df.with_columns(
        pl.col("tran_date_time").str.strptime(pl.Datetime, "%Y-%m-%d %H:%M:%S").alias("ts")
    )

    # Extract route_id from ngpt_route (e.g., "25 трамвай" -> "25")
    df = df.with_columns(
        pl.col("ngpt_route").str.extract(r"^(\d+)").alias("route_id")
    )

    # Filter to expected routes
    df = df.filter(pl.col("route_id").is_in(EXPECTED_ROUTES))

    # Remove duplicates
    df = df.unique(subset=["tran_no"])

    # Filter out invalid data
    df = df.filter(
        (pl.col("ts").is_not_null()) &
        (pl.col("route_id").is_not_null())
    )

    final_count = len(df)
    dropped = initial_count - final_count

    log_stage_end("normalize_validations", rows_processed=final_count, rows_dropped=dropped)
    return df


def calculate_target_hourly(df: pl.DataFrame) -> pl.DataFrame:
    """Calculate target_hourly: boardings by route and hour."""
    log_stage_start("calculate_target_hourly")

    # Extract date and hour
    df = df.with_columns([
        pl.col("ts").dt.date().alias("date"),
        pl.col("ts").dt.hour().alias("hour"),
    ])

    # Aggregate by route, date, hour
    target = (
        df.group_by(["route_id", "date", "hour"])
        .agg(pl.len().alias("boardings"))
        .sort(["route_id", "date", "hour"])
    )

    log_stage_end("calculate_target_hourly", rows_processed=len(target))
    return target


def build_reference_data(data: Dict[str, pl.DataFrame]) -> Dict[str, pl.DataFrame]:
    """Build reference tables: routes, stops, route_stops, route_geometry."""
    log_stage_start("build_reference")

    # TODO: Build from spravochniki xlsx files
    # For now, create stub reference data

    routes = pl.DataFrame({
        "route_id": EXPECTED_ROUTES,
        "name": [f"{r} трамвай" for r in EXPECTED_ROUTES],
    })

    log_stage_end("build_reference", rows_processed=len(routes))
    return {"routes": routes}


def run_ingestion_pipeline(zip_path: str) -> Dict:
    """Run full ingestion pipeline."""
    logger.info(f"Starting ingestion pipeline for {zip_path}")

    # Extract
    data = extract_dataset(zip_path)

    # Normalize
    if "train.csv" in data:
        train_norm = normalize_validations(data["train.csv"])
    else:
        train_norm = pl.DataFrame()

    if "test.csv" in data:
        test_norm = normalize_validations(data["test.csv"])
    else:
        test_norm = pl.DataFrame()

    # Combine
    if len(train_norm) > 0 and len(test_norm) > 0:
        all_validations = pl.concat([train_norm, test_norm])
    else:
        all_validations = train_norm if len(train_norm) > 0 else test_norm

    # Calculate target
    target_hourly = calculate_target_hourly(all_validations)

    # Build reference
    reference = build_reference_data(data)

    logger.info("Ingestion pipeline completed")

    return {
        "validations": all_validations,
        "target_hourly": target_hourly,
        "reference": reference,
    }

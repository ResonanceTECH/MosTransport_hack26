"""Export dataset for ML training.

Produces a single Parquet file with the target variable (boardings)
at route × hour granularity, ready for model training.
"""

import logging
import zipfile
from io import BytesIO
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

EXPECTED_ROUTES = ["1", "5", "7", "11", "12", "17", "25", "26", "28", "50"]


def export_labels_to_parquet(zip_path: str, output_path: str) -> dict:
    """Export labels from dataset.zip to Parquet for ML training.

    Uses the pre-computed labels (labels_day_train.csv, labels_day_test.csv)
    which contain the target variable: boardings by route × date × hour.
    """
    logger.info(f"Exporting labels from {zip_path} to {output_path}")

    all_labels = []

    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.startswith("labels/") and name.endswith(".csv"):
                logger.info(f"Reading {name}")
                with zf.open(name) as f:
                    df = pd.read_csv(f, sep=";")
                    all_labels.append(df)

    if not all_labels:
        raise ValueError("No labels found in dataset.zip")

    # Combine train and test labels
    combined = pd.concat(all_labels, ignore_index=True)

    # Normalize columns: route;date;hour;boardings
    combined = combined.rename(columns={"route": "route_id"})

    # Ensure correct types
    combined["route_id"] = combined["route_id"].astype(str)
    combined["date"] = pd.to_datetime(combined["date"]).dt.date
    combined["hour"] = combined["hour"].astype(int)
    combined["boardings"] = combined["boardings"].astype(int)

    # Sort for consistency
    combined = combined.sort_values(["route_id", "date", "hour"]).reset_index(drop=True)

    # Write to Parquet
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    combined.to_parquet(output_path, compression="snappy", index=False)

    logger.info(f"Exported {len(combined)} rows to {output_path}")

    # Print summary
    print(f"\n{'='*60}")
    print(f"Export complete: {output_path}")
    print(f"Total rows: {len(combined)}")
    print(f"Date range: {combined['date'].min()} — {combined['date'].max()}")
    print(f"Routes: {sorted(combined['route_id'].unique().tolist())}")
    print(f"Columns: {list(combined.columns)}")
    print(f"{'='*60}\n")

    return {
        "output_path": output_path,
        "rows": len(combined),
        "date_from": str(combined["date"].min()),
        "date_to": str(combined["date"].max()),
        "routes": sorted(combined["route_id"].unique().tolist()),
        "columns": list(combined.columns),
    }


if __name__ == "__main__":
    import sys

    zip_path = sys.argv[1] if len(sys.argv) > 1 else "/app/data/dataset.zip"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "/app/data/labels.parquet"

    logging.basicConfig(level=logging.INFO)
    export_labels_to_parquet(zip_path, output_path)

"""Submission in the organizers' format: route;date;hour;prediction on the full Nov-Dec 2025 grid."""

from pathlib import Path

import numpy as np
import pandas as pd

import config

COLUMNS = ["route", "date", "hour", "prediction"]


def load_template() -> pd.DataFrame:
    return pd.read_csv(config.SUBMISSION_TEMPLATE, sep=";", dtype={"date": str})


def make_submission(frame: pd.DataFrame, prediction: np.ndarray) -> pd.DataFrame:
    """Predictions rounded to integers (the checker rounds anyway), rows in the template's order."""
    predicted = pd.DataFrame({
        "route": frame["route_id"].astype(int).to_numpy(),
        "date": frame["date"].dt.strftime("%Y-%m-%d").to_numpy(),
        "hour": frame["hour"].astype(int).to_numpy(),
        "prediction": np.rint(np.clip(prediction, 0, None)).astype(int),
    })
    template = load_template()[["route", "date", "hour"]]
    result = template.merge(predicted, on=["route", "date", "hour"], how="left")
    if result["prediction"].isna().any():
        raise ValueError(f"{int(result['prediction'].isna().sum())} template keys have no prediction")
    result["prediction"] = result["prediction"].astype(int)
    return result[COLUMNS]


def validate_submission(path: Path) -> dict:
    """Checks the rules of the dataset README; raises ValueError listing every violation."""
    errors = []
    header = path.read_text(encoding="utf-8").splitlines()[0]
    if header != ";".join(COLUMNS):
        raise ValueError(f"{path.name}: header must be '{';'.join(COLUMNS)}', got '{header}'")
    sub = pd.read_csv(path, sep=";", dtype={"date": str})
    template = load_template()
    expected_rows = len(config.ROUTES) * config.HORIZON_DAYS * 24
    if len(sub) != expected_rows:
        errors.append(f"{len(sub)} rows, expected {expected_rows} (10 routes x 61 days x 24 hours)")
    if sub.duplicated(["route", "date", "hour"]).any():
        errors.append("duplicated keys")
    if len(sub) == len(template) and not sub[["route", "date", "hour"]].equals(template[["route", "date", "hour"]]):
        errors.append("keys or their order differ from test_submission.csv")
    if set(sub["route"]) != set(config.ROUTES):
        errors.append(f"routes {sorted(set(sub['route']))} != {config.ROUTES}")
    dates = pd.to_datetime(sub["date"], format="%Y-%m-%d", errors="coerce")
    if dates.isna().any() or dates.min() != pd.Timestamp(config.FORECAST_START) or dates.max() != pd.Timestamp(config.FORECAST_END):
        errors.append("dates must be YYYY-MM-DD within 2025-11-01 .. 2025-12-31")
    if not sub["hour"].between(0, 23).all():
        errors.append("hour must be 0..23")
    prediction = pd.to_numeric(sub["prediction"], errors="coerce")
    if prediction.isna().any() or not np.isfinite(prediction).all() or (prediction < 0).any():
        errors.append("prediction must be a finite number >= 0")
    if errors:
        raise ValueError(f"{path.name}: " + "; ".join(errors))
    return {
        "file": str(path),
        "rows": len(sub),
        "total_prediction": int(prediction.sum()),
        "mean_daily_per_route": prediction.groupby(sub["route"]).sum().div(config.HORIZON_DAYS).round(0).astype(int).to_dict(),
        "valid": True,
    }

"""Hourly dataset route x date x hour: target + calendar + weather + traffic from the ETL service."""

import logging
import os

import httpx
import pandas as pd

import config

log = logging.getLogger("ml.data")

DATASET_PARQUET = config.DATA_DIR / "dataset_hourly.parquet"
DATASET_CSV = config.DATA_DIR / "dataset_hourly.csv"


def load_from_api(base_url: str = config.ETL_API_URL) -> pd.DataFrame:
    """Builds the selection through the ETL API: POST /make_data -> id -> GET /get_data/{id}."""
    with httpx.Client(base_url=base_url, timeout=300) as client:
        created = client.post("/make_data", json={
            "date_from": str(config.DATA_START), "date_to": str(config.FORECAST_END),
            "weather": True, "traffic": True, "day_type": True,
        })
        created.raise_for_status()
        meta = created.json()
        log.info("ETL selection id=%s status=%s rows=%s", meta["id"], meta["status"], meta["rows"])
        data = client.get(f"/get_data/{meta['id']}")
        data.raise_for_status()
    return pd.DataFrame(data.json()["rows"])


def load_from_db(database_url: str | None = None) -> pd.DataFrame:
    import psycopg

    url = database_url or os.environ["DATABASE_URL"]
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM features_hourly ORDER BY route_id, date, hour")
        columns = [c.name for c in cur.description]
        return pd.DataFrame(cur.fetchall(), columns=columns)


def normalize(raw: pd.DataFrame) -> pd.DataFrame:
    """Typed frame on the full grid with derived model-ready columns."""
    df = raw.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(config.KEYS).reset_index(drop=True)
    for column in ["is_dayoff", "is_short_day", "is_holiday", "is_transfer_workday", "weather_is_forecast"]:
        df[column] = df[column].astype("float32")
    df["is_saturday_profile"] = (df["day_type"] == "saturday").astype("float32")
    df["is_sunday_profile"] = (df["day_type"] == "sunday").astype("float32")
    df["is_rain"] = df["precip_type"].isin(["rain", "sleet"]).astype("float32")
    df["is_snow"] = df["precip_type"].isin(["snow", "sleet"]).astype("float32")
    numeric = [c for c in config.WEATHER_FEATURES + config.TRAFFIC_FEATURES if c not in ("is_rain", "is_snow")]
    df[numeric] = df[numeric].astype("float32")
    df[config.TARGET] = pd.to_numeric(df[config.TARGET], errors="coerce").astype("float32")
    df["day_of_week"] = df["date"].dt.dayofweek.astype("int8")  # 0 = Monday
    df["route_id"] = df["route_id"].astype("int16")
    df["hour"] = df["hour"].astype("int8")
    return df


def check_against_labels(df: pd.DataFrame) -> dict:
    """Target in the dataset must equal organizers' labels/*.csv (missing hours in labels = 0)."""
    if not all(p.exists() for p in config.LABEL_FILES.values()):
        return {"status": "labels not found"}
    labels = pd.concat(pd.read_csv(p, sep=";", parse_dates=["date"]) for p in config.LABEL_FILES.values())
    labels = labels.rename(columns={"route": "route_id"})
    known = df[df["date"] <= pd.Timestamp(config.DATA_END)]
    merged = known.merge(labels, on=config.KEYS, how="left", suffixes=("", "_labels"))
    merged["boardings_labels"] = merged["boardings_labels"].fillna(0)
    return {
        "rows": len(known),
        "sum_dataset": int(known[config.TARGET].astype("float64").sum()),
        "sum_labels": int(labels["boardings"].sum()),
        "mismatched_cells": int((merged[config.TARGET] != merged["boardings_labels"]).sum()),
        "labels_rows_not_in_grid": len(labels) - int(merged["boardings_labels"].gt(0).sum()),
    }


def prepare(source: str = "api", database_url: str | None = None) -> pd.DataFrame:
    """Loads, validates and caches the dataset to data/dataset_hourly.{parquet,csv}."""
    raw = load_from_api() if source == "api" else load_from_db(database_url)
    df = normalize(raw)
    expected = len(config.ROUTES) * ((config.FORECAST_END - config.DATA_START).days + 1) * 24
    if len(df) != expected or df.duplicated(config.KEYS).any():
        raise ValueError(f"grid is incomplete: {len(df)} rows, expected {expected} unique route x date x hour")
    check = check_against_labels(df)
    if check.get("mismatched_cells"):
        raise ValueError(f"target does not match organizers' labels: {check}")
    log.info("dataset ready: %s rows, labels check %s", len(df), check)
    config.DATA_DIR.mkdir(exist_ok=True)
    df.to_parquet(DATASET_PARQUET, index=False)
    export = df.rename(columns={"route_id": "route"}).assign(date=df["date"].dt.date)
    export.to_csv(DATASET_CSV, sep=";", index=False)
    return df


def load_dataset() -> pd.DataFrame:
    if not DATASET_PARQUET.exists():
        raise FileNotFoundError(f"{DATASET_PARQUET} not found: run `python train.py prepare` first")
    return pd.read_parquet(DATASET_PARQUET)

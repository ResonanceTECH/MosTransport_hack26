"""Model features from request rows. Same logic as PIPELINE/data.py (normalize) and PIPELINE/features.py
(build_window): the service must compute exactly what the models were trained on."""

import numpy as np
import pandas as pd

TARGET = "boardings"
KEYS = ["route_id", "date", "hour"]
HISTORY_DAYS = 56


def normalize(rows: pd.DataFrame) -> pd.DataFrame:
    df = rows.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(KEYS).reset_index(drop=True)
    for column in ["is_dayoff", "is_short_day", "is_holiday", "is_transfer_workday"]:
        df[column] = df[column].astype("float32")
    df["is_saturday_profile"] = (df["day_type"] == "saturday").astype("float32")
    df["is_sunday_profile"] = (df["day_type"] == "sunday").astype("float32")
    df["is_rain"] = df["precip_type"].isin(["rain", "sleet"]).astype("float32")
    df["is_snow"] = df["precip_type"].isin(["snow", "sleet"]).astype("float32")
    numeric = ["temperature_c", "precipitation_mm", "snowfall_cm", "wind_speed_ms", "humidity_pct", "cloud_cover_pct",
               "traffic_congestion_index", "traffic_duration_s"]
    df[numeric] = df[numeric].astype("float32")
    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce").astype("float32")
    df["day_of_week"] = df["date"].dt.dayofweek.astype("int8")
    df["route_id"] = df["route_id"].astype("int16")
    df["hour"] = df["hour"].astype("int8")
    return df


def _profile(history: pd.DataFrame, since: pd.Timestamp, keys: list[str], name: str) -> pd.DataFrame:
    recent = history[history["date"] >= since]
    return recent.groupby(keys, as_index=False)[TARGET].mean().rename(columns={TARGET: name})


def build_window(df: pd.DataFrame, origin: pd.Timestamp) -> pd.DataFrame:
    """Rows from the origin on, with history features from the HISTORY_DAYS days before it."""
    history = df[(df["date"] < origin) & (df["date"] >= origin - pd.Timedelta(days=HISTORY_DAYS))].dropna(subset=[TARGET])
    target = df[df["date"] >= origin].copy()
    since_28 = origin - pd.Timedelta(days=28)
    since_56 = origin - pd.Timedelta(days=56)
    profiles = [
        (_profile(history, since_28, ["route_id", "hour", "day_type"], "p_daytype_28"), ["route_id", "hour", "day_type"]),
        (_profile(history, since_56, ["route_id", "hour", "day_type"], "p_daytype_56"), ["route_id", "hour", "day_type"]),
        (_profile(history, since_56, ["route_id", "hour", "day_of_week"], "p_dow_56"), ["route_id", "hour", "day_of_week"]),
        (_profile(history, since_28, ["route_id", "hour"], "p_hour_28"), ["route_id", "hour"]),
    ]
    for profile, keys in profiles:
        target = target.merge(profile, on=keys, how="left")
    target["p_daytype_28"] = target["p_daytype_28"].fillna(target["p_hour_28"])
    target["p_daytype_56"] = target["p_daytype_56"].fillna(target["p_hour_28"])
    daily = history.groupby(["route_id", "date"], as_index=False)[TARGET].sum()
    level_7 = daily[daily["date"] >= origin - pd.Timedelta(days=7)].groupby("route_id")[TARGET].mean()
    level_28 = daily[daily["date"] >= since_28].groupby("route_id")[TARGET].mean()
    target["level_7"] = target["route_id"].map(level_7).astype("float32")
    target["level_28"] = target["route_id"].map(level_28).astype("float32")
    profile_columns = ["p_daytype_28", "p_daytype_56", "p_dow_56", "p_hour_28", "level_7", "level_28"]
    target[profile_columns] = target[profile_columns].astype("float32")
    return target.sort_values(KEYS).reset_index(drop=True)


def base_level(frame: pd.DataFrame) -> np.ndarray:
    return frame["p_daytype_28"].fillna(0).to_numpy(dtype="float64") + 1.0


def has_history(frame: pd.DataFrame) -> np.ndarray:
    return frame["level_28"].fillna(0).to_numpy() > 0

"""Features relative to a forecast origin.

A window = forecast origin + the next HORIZON_DAYS days. History features (profiles, level, trend)
use only target values strictly before the origin, exactly like the submission, where Nov-Dec is
forecast from data up to Oct 31. Calendar, weather and traffic are known for the target hour itself.
"""

from datetime import date, timedelta

import numpy as np
import pandas as pd

import config

PROFILE_FEATURES = [
    "p_daytype_28",   # mean boardings, same route + hour + day type, last 28 days before origin
    "p_daytype_56",   # same over 56 days
    "p_dow_56",       # same route + hour + weekday, 56 days
    "p_hour_28",      # same route + hour, any day, 28 days
    "level_7",        # mean daily boardings of the route, last 7 days
    "level_28",       # same over 28 days
    "trend_7_28",     # level_7 / level_28
]
CONTEXT_FEATURES = ["route_id", "hour", "day_of_week", "horizon_day"]
CATEGORICAL_FEATURES = ["route_id", "hour", "day_of_week"]


# Horizon and trend let a model extrapolate the seasonal drift of its training windows (spring -> summer
# decline), which breaks on Sep (back to school) and is unknowable for Nov-Dec; the backtest decides.
DRIFT_FEATURES = ["horizon_day", "trend_7_28"]


def feature_columns(groups: tuple[str, ...] = tuple(config.FEATURE_GROUPS), drift: bool = False) -> list[str]:
    external = [col for group in groups for col in config.FEATURE_GROUPS[group]]
    columns = CONTEXT_FEATURES + PROFILE_FEATURES + external
    return columns if drift else [c for c in columns if c not in DRIFT_FEATURES]


def base_level(frame: pd.DataFrame) -> np.ndarray:
    """Seasonal profile the models correct multiplicatively: target / base is what they learn."""
    return frame["p_daytype_28"].fillna(0).to_numpy(dtype="float64") + 1.0


def _profile(history: pd.DataFrame, since: pd.Timestamp, keys: list[str], name: str) -> pd.DataFrame:
    recent = history[history["date"] >= since]
    return recent.groupby(keys, as_index=False)[config.TARGET].mean().rename(columns={config.TARGET: name})


def build_window(df: pd.DataFrame, origin: date, until: date | None = None, horizon: int = config.HORIZON_DAYS) -> pd.DataFrame:
    """Rows for dates [origin, origin + horizon) (cut at `until`) with origin-relative features."""
    origin_ts = pd.Timestamp(origin)
    end_ts = origin_ts + pd.Timedelta(days=horizon - 1)
    if until is not None:
        end_ts = min(end_ts, pd.Timestamp(until))
    history = df[(df["date"] < origin_ts) & (df["date"] >= origin_ts - pd.Timedelta(days=56))].dropna(subset=[config.TARGET])
    if history.empty:
        raise ValueError(f"no history before origin {origin}")
    target = df[(df["date"] >= origin_ts) & (df["date"] <= end_ts)].copy()

    since_28 = origin_ts - pd.Timedelta(days=28)
    since_56 = origin_ts - pd.Timedelta(days=56)
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

    daily = history.groupby(["route_id", "date"], as_index=False)[config.TARGET].sum()
    level_7 = daily[daily["date"] >= origin_ts - pd.Timedelta(days=7)].groupby("route_id")[config.TARGET].mean()
    level_28 = daily[daily["date"] >= since_28].groupby("route_id")[config.TARGET].mean()
    target["level_7"] = target["route_id"].map(level_7).astype("float32")
    target["level_28"] = target["route_id"].map(level_28).astype("float32")
    target["trend_7_28"] = np.where(target["level_28"] > 0, target["level_7"] / target["level_28"].where(target["level_28"] > 0, 1), np.nan)
    target["horizon_day"] = (target["date"] - origin_ts).dt.days.astype("int16")
    target["origin"] = origin_ts
    target[PROFILE_FEATURES] = target[PROFILE_FEATURES].astype("float32")
    return target.sort_values(config.KEYS).reset_index(drop=True)


def training_origins(train_end: date, first: date = config.FIRST_TRAIN_ORIGIN, step: int = config.ORIGIN_STEP_DAYS) -> list[date]:
    """Weekly origins whose windows start at least a week before train_end (the last ones are truncated)."""
    origins, origin = [], first
    while origin <= train_end - timedelta(days=6):
        origins.append(origin)
        origin += timedelta(days=step)
    return origins


def build_training_set(df: pd.DataFrame, train_end: date, first: date = config.FIRST_TRAIN_ORIGIN) -> pd.DataFrame:
    """Stack of windows with targets up to train_end: the model sees many "forecast 2 months ahead" cases."""
    windows = [build_window(df, origin, until=train_end) for origin in training_origins(train_end, first)]
    return pd.concat(windows, ignore_index=True).dropna(subset=[config.TARGET])


def has_history(frame: pd.DataFrame) -> np.ndarray:
    """Routes without boardings in the 4 weeks before the origin (route 5) get a zero forecast."""
    return frame["level_28"].fillna(0).to_numpy() > 0

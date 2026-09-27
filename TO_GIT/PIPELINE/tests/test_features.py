from datetime import date

import numpy as np
import pandas as pd
import pytest

import config
from features import PROFILE_FEATURES, base_level, build_training_set, build_window, feature_columns, training_origins


def test_window_covers_horizon(dataset):
    window = build_window(dataset, date(2025, 3, 1), horizon=30)
    assert window["date"].min() == pd.Timestamp("2025-03-01")
    assert window["date"].max() == pd.Timestamp("2025-03-30")
    assert len(window) == 2 * 30 * 24
    assert window["horizon_day"].between(0, 29).all()


def test_profiles_use_only_history_before_origin(dataset):
    """Changing the target on or after the origin must not change any history feature."""
    origin = date(2025, 3, 1)
    before = build_window(dataset, origin, horizon=30)
    future_changed = dataset.copy()
    future_changed.loc[future_changed["date"] >= pd.Timestamp(origin), config.TARGET] *= 10
    after = build_window(future_changed, origin, horizon=30)
    pd.testing.assert_frame_equal(before[PROFILE_FEATURES], after[PROFILE_FEATURES])

    past_changed = dataset.copy()
    past_changed.loc[past_changed["date"] < pd.Timestamp(origin), config.TARGET] *= 10
    assert not np.allclose(before["p_daytype_28"], build_window(past_changed, origin, horizon=30)["p_daytype_28"])


def test_profile_matches_manual_mean(dataset):
    origin = pd.Timestamp("2025-03-03")
    window = build_window(dataset, origin.date(), horizon=7)
    row = window[(window["route_id"] == 1) & (window["hour"] == 8) & (window["day_type"] == "workday")].iloc[0]
    history = dataset[(dataset["route_id"] == 1) & (dataset["hour"] == 8) & (dataset["day_type"] == "workday")
                      & (dataset["date"] < origin) & (dataset["date"] >= origin - pd.Timedelta(days=28))]
    assert row["p_daytype_28"] == pytest.approx(history[config.TARGET].mean(), rel=1e-5)


def test_training_set_never_contains_targets_after_train_end(dataset):
    train_end = date(2025, 4, 10)
    train = build_training_set(dataset, train_end)
    assert train["date"].max() <= pd.Timestamp(train_end)
    origins = training_origins(train_end)
    assert origins[0] == config.FIRST_TRAIN_ORIGIN and origins[-1] <= date(2025, 4, 4)


def test_drift_features_are_optional():
    assert "horizon_day" not in feature_columns() and "horizon_day" in feature_columns(drift=True)
    assert not set(feature_columns(groups=())) & set(config.WEATHER_FEATURES)


def test_base_level_is_positive(dataset):
    window = build_window(dataset, date(2025, 3, 1), horizon=7)
    assert (base_level(window) >= 1).all()

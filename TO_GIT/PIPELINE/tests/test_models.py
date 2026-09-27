from datetime import date

import numpy as np
import pytest

import config
from features import build_training_set, build_window, feature_columns
from metrics import wape_score
from models import Ensemble, LGBMModel, SeasonalBaseline, TorchModel, relative_target


@pytest.fixture(scope="module")
def split(dataset):
    train = build_training_set(dataset, date(2025, 3, 31))
    valid = build_window(dataset, date(2025, 4, 1), horizon=30)
    return train, valid


def test_weighted_ratio_l1_equals_absolute_l1(split):
    train, _ = split
    ratio, weight = relative_target(train)
    prediction_ratio = np.full_like(ratio, 0.9)
    weighted = np.sum(weight * np.abs(ratio - prediction_ratio))
    absolute = np.sum(np.abs(train[config.TARGET] - prediction_ratio * weight))
    assert weighted == pytest.approx(absolute)


@pytest.mark.parametrize("make", [
    lambda: SeasonalBaseline(),
    lambda: LGBMModel(num_boost_round=50),
    lambda: TorchModel({"epochs": 3, "hidden": [32]}),
])
def test_models_learn_and_respect_constraints(split, make):
    train, valid = split
    model = make().fit(train, feature_columns())
    prediction = model.predict(valid)
    assert prediction.shape == (len(valid),)
    assert (prediction >= 0).all()
    assert (prediction[valid["route_id"].to_numpy() == 5] == 0).all()  # no history -> zero
    assert wape_score(valid[config.TARGET], prediction) > 0.5


def test_save_load_roundtrip(split, tmp_path):
    train, valid = split
    lgbm = LGBMModel(num_boost_round=30).fit(train, feature_columns())
    lgbm.save(tmp_path / "m.txt")
    np.testing.assert_allclose(LGBMModel.load(tmp_path / "m.txt").predict(valid), lgbm.predict(valid))
    torch_model = TorchModel({"epochs": 2, "hidden": [16]}).fit(train, feature_columns())
    torch_model.save(tmp_path / "m.pt")
    np.testing.assert_allclose(TorchModel.load(tmp_path / "m.pt").predict(valid), torch_model.predict(valid), rtol=1e-5)


def test_ensemble_is_weighted_average(split):
    train, valid = split
    a = SeasonalBaseline()
    b = LGBMModel(num_boost_round=20).fit(train, feature_columns())
    np.testing.assert_allclose(Ensemble([a, b], [0.25, 0.75]).predict(valid), 0.25 * a.predict(valid) + 0.75 * b.predict(valid))

import numpy as np
import pandas as pd
import pytest

import config
from submission import load_template, make_submission, validate_submission

pytestmark = pytest.mark.skipif(not config.SUBMISSION_TEMPLATE.exists(), reason="dataset/test_submission.csv not available")


@pytest.fixture()
def forecast_frame():
    """Forecast grid in a shuffled order: make_submission must restore the template order."""
    template = load_template()
    frame = pd.DataFrame({"route_id": template["route"], "date": pd.to_datetime(template["date"]), "hour": template["hour"]})
    return frame.sample(frac=1, random_state=0).reset_index(drop=True)


def test_valid_submission_passes(forecast_frame, tmp_path):
    prediction = np.linspace(0, 500.6, len(forecast_frame))
    sub = make_submission(forecast_frame, prediction)
    assert sub[["route", "date", "hour"]].equals(load_template()[["route", "date", "hour"]])
    assert sub["prediction"].dtype.kind == "i"
    path = tmp_path / "submission.csv"
    sub.to_csv(path, sep=";", index=False)
    report = validate_submission(path)
    assert report["valid"] and report["rows"] == 14640


@pytest.mark.parametrize("corrupt, message", [
    (lambda s: s.assign(prediction=-1), "prediction"),
    (lambda s: s.iloc[:-1], "rows"),
    (lambda s: s.rename(columns={"prediction": "pred"}), "header"),
    (lambda s: s.iloc[::-1], "order"),
])
def test_invalid_submission_is_rejected(forecast_frame, tmp_path, corrupt, message):
    sub = corrupt(make_submission(forecast_frame, np.ones(len(forecast_frame))))
    path = tmp_path / "bad.csv"
    sub.to_csv(path, sep=";", index=False)
    with pytest.raises(ValueError, match=message):
        validate_submission(path)


def test_missing_prediction_raises(forecast_frame):
    with pytest.raises(ValueError, match="no prediction"):
        make_submission(forecast_frame.iloc[:-5], np.ones(len(forecast_frame) - 5))

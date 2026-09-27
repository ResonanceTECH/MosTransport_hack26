import json
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app

EXAMPLES = Path(__file__).resolve().parents[1] / "examples"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def request_body() -> dict:
    return json.loads((EXAMPLES / "request_example.json").read_text())


def test_health(client):
    r = client.get("/health", headers={"X-Request-ID": "t-1"})
    assert r.status_code == 200 and r.headers["X-Request-ID"] == "t-1"
    body = r.json()
    assert body["status"] == "OK" and body["model_loaded"] and body["default_model"] == "ensemble"


def test_predict_reproduces_submission(client, request_body):
    """The service must give the same forecast as the training pipeline (submission_ensemble.csv, rounded)."""
    r = client.post("/predict", json=request_body)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["model"] == "ensemble" and body["origin"] == "2025-11-01" and body["horizon_days"] == 7
    got = pd.DataFrame(body["predictions"])
    expected = pd.read_csv(EXAMPLES / "expected_ensemble.csv", sep=";")
    merged = got.merge(expected, left_on=["route_id", "date", "hour"], right_on=["route", "date", "hour"])
    assert len(merged) == len(expected) == 336
    assert (merged["prediction_x"].round() - merged["prediction_y"]).abs().max() <= 1


@pytest.mark.parametrize("model", ["lightgbm", "pytorch", "baseline"])
def test_other_models(client, request_body, model):
    body = client.post("/predict", json={**request_body, "model": model}).json()
    assert body["model"] == model and body["rows"] == 336
    assert all(p["prediction"] >= 0 for p in body["predictions"])


def test_origin_defaults_to_first_unknown_date(client, request_body):
    body = client.post("/predict", json={**request_body, "origin": None}).json()
    assert body["origin"] == "2025-11-01"


def test_route_without_history_gets_zero_and_warning(client, request_body):
    rows = [r for r in request_body["rows"] if r["route_id"] == 1 and r["boardings"] is None][:24]
    rows = [{**r, "route_id": 5} for r in rows] + request_body["rows"]
    body = client.post("/predict", json={**request_body, "rows": rows}).json()
    assert all(p["prediction"] == 0 for p in body["predictions"] if p["route_id"] == 5)
    assert any("[5]" in w for w in body["warnings"])


@pytest.mark.parametrize("mutate, message", [
    (lambda b: {**b, "rows": []}, "at least 1"),
    (lambda b: {**b, "rows": b["rows"] + b["rows"][:1]}, "duplicated"),
    (lambda b: {**b, "origin": None, "rows": [r for r in b["rows"] if r["boardings"] is not None]}, "nothing to forecast"),
    (lambda b: {**b, "model": "xgboost"}, "Input should be"),
    (lambda b: {**b, "rows": [{**b["rows"][0], "route_id": 99}]}, "unknown route_id"),
    (lambda b: {**b, "rows": [{**b["rows"][0], "hour": 24}]}, "less than or equal to 23"),
])
def test_invalid_requests(client, request_body, mutate, message):
    r = client.post("/predict", json=mutate(request_body))
    assert r.status_code == 422
    error = r.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert any(message in e["msg"] for e in error["details"]["errors"]), error


def test_unknown_path_uses_error_format(client):
    r = client.get("/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "NOT_FOUND"

"""Prediction service: GET /health, POST /predict.

    uvicorn app.main:app --host 0.0.0.0 --port 8080
    python -m app.main schemas      # write schemas/*.json and openapi.json
"""

import json
import logging
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.features import build_window, has_history, normalize
from app.observability import install_metrics, log_to_database
from app.predictor import Predictor
from app.schemas import ErrorBody, ErrorResponse, HealthResponse, PredictRequest, PredictResponse

VERSION = "1.0.0"
ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("MODEL_PATH") or ROOT / "model" / "model.pkl")
log = logging.getLogger("ml.api")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {"ts": datetime.fromtimestamp(record.created).astimezone().isoformat(timespec="milliseconds"),
                 "service": "ml", "level": record.levelname, "message": record.getMessage()}
        for key in ("request_id", "event", "method", "path", "status", "latency_ms"):
            if hasattr(record, key):
                entry[key] = getattr(record, key)
        if record.exc_info:
            entry["error"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details or {}


def error_response(request: Request, status: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details or {},
                                         request_id=getattr(request.state, "request_id", None)))
    return JSONResponse(status_code=status, content=body.model_dump(mode="json"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    app.state.predictor, app.state.load_error = None, None
    try:
        app.state.predictor = Predictor(MODEL_PATH)
        log.info("model loaded from %s, default %s", MODEL_PATH, app.state.predictor.default_model, extra={"event": "model_loaded"})
    except Exception as exc:
        app.state.load_error = repr(exc)
        log.exception("model is not loaded", extra={"event": "model_load_failed"})
    yield


ERRORS = {code: {"model": ErrorResponse, "description": text} for code, text in {
    422: "Invalid request: schema violation or rows that cannot be forecast",
    500: "Unexpected error",
    503: "Model is not loaded",
}.items()}

app = FastAPI(
    title="Transport boardings prediction API",
    version=VERSION,
    description=("Hourly boardings forecast for Moscow tram routes (LightGBM + PyTorch ensemble). "
                 "`POST /predict` takes rows in the ETL `features_hourly` format: history with known `boardings` "
                 "(56 days before the forecast start are used) and the hours to forecast with `boardings = null`."),
    lifespan=lifespan,
    servers=[{"url": f"http://localhost:{os.getenv('PORT', '1020')}", "description": "local run or Docker container"}],
)
install_metrics(app)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        log.exception("unhandled error", extra={"request_id": request.state.request_id, "event": "unhandled_error"})
        response = error_response(request, 500, "INTERNAL_ERROR", "Internal error, retry later", {"reason": repr(exc)})
    response.headers["X-Request-ID"] = request.state.request_id
    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    log.info("%s %s -> %s", request.method, request.url.path, response.status_code, extra={
        "request_id": request.state.request_id, "event": "http_request", "method": request.method,
        "path": request.url.path, "status": response.status_code, "latency_ms": latency_ms})
    if request.url.path not in ("/metrics", "/health"):
        log_to_database(request_id=request.state.request_id, method=request.method, path=request.url.path,
                        status=response.status_code, latency_ms=latency_ms)
    return response


@app.exception_handler(ApiError)
async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    return error_response(request, exc.status, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"loc": list(e.get("loc", []))[:4], "msg": str(e.get("msg", "")).removeprefix("Value error, ")}
              for e in exc.errors()[:20]]
    return error_response(request, 422, "VALIDATION_ERROR", "Request does not match the schema",
                          {"errors": errors, "total_errors": len(exc.errors())})


@app.exception_handler(StarletteHTTPException)
async def handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    return error_response(request, exc.status_code, code, str(exc.detail), {"path": request.url.path})


def get_predictor(request: Request) -> Predictor:
    if request.app.state.predictor is None:
        raise ApiError(503, "MODEL_NOT_LOADED", "Model is not loaded", {"reason": request.app.state.load_error,
                                                                      "model_path": str(MODEL_PATH)})
    return request.app.state.predictor


@app.get("/health", response_model=HealthResponse, responses={503: ERRORS[503]}, summary="Service and model status")
def health(request: Request) -> HealthResponse:
    predictor = get_predictor(request)
    return HealthResponse(status="OK", model_loaded=True, default_model=predictor.default_model,
                          trained_on=predictor.info["trained_on"], version=VERSION)


@app.post("/predict", response_model=PredictResponse, responses=ERRORS, summary="Forecast boardings for the requested hours")
def predict(body: PredictRequest, request: Request) -> PredictResponse:
    predictor = get_predictor(request)
    model = body.model or predictor.default_model
    frame = normalize(pd.DataFrame([row.model_dump() for row in body.rows]))
    origin = pd.Timestamp(body.origin or frame.loc[frame["boardings"].isna(), "date"].min())
    window = build_window(frame, origin)
    prediction = predictor.predict(window, model)

    warnings = []
    no_history = sorted(window.loc[~has_history(window), "route_id"].unique().tolist())
    if no_history:
        warnings.append(f"routes {no_history} have no boardings in the 28 days before {origin.date()}: forecast is 0")
    history_days = frame.loc[(frame["date"] < origin) & frame["boardings"].notna(), "date"].nunique()
    if history_days < 56:
        warnings.append(f"only {history_days} days of history before origin, the models were trained with 56")
    log.info("predict model=%s origin=%s rows=%d", model, origin.date(), len(window),
             extra={"request_id": request.state.request_id, "event": "predict_done"})
    log_to_database(request_id=request.state.request_id, event="predict_done",
                    message=f"predicted {len(window)} hours with {model}",
                    payload={"model": model, "origin": str(origin.date()), "rows_in": len(body.rows),
                             "rows_out": len(window), "total_prediction": round(float(prediction.sum()), 1),
                             "warnings": warnings})
    return PredictResponse(
        model=model, origin=origin.date(), horizon_days=int(window["date"].nunique()), rows=len(window),
        total_prediction=round(float(prediction.sum()), 1), warnings=warnings,
        predictions=[{"route_id": int(r), "date": d.date(), "hour": int(h), "prediction": round(float(p), 1)}
                     for r, d, h, p in zip(window["route_id"], window["date"], window["hour"], prediction)],
    )


def write_schemas() -> None:
    out = ROOT / "schemas"
    out.mkdir(exist_ok=True)
    for name, model in (("predict_request", PredictRequest), ("predict_response", PredictResponse)):
        schema = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": f"{name}.schema.json",
                  **model.model_json_schema()}
        (out / f"{name}.schema.json").write_text(json.dumps(schema, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "openapi.json").write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n")
    print(f"schemas written to {out} and {ROOT / 'openapi.json'}")


if __name__ == "__main__" and sys.argv[1:] == ["schemas"]:
    write_schemas()

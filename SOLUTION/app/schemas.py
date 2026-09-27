"""Request/response schemas. Rows follow the ETL `features_hourly` / `GET /get_data/{id}` format the models were
trained on; extra ETL fields (ts_hour, split, weather_source, ...) are accepted and ignored."""

from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ROUTES = [1, 5, 7, 11, 12, 17, 25, 26, 28, 50]
MAX_ROWS = 200_000


class FeatureRow(BaseModel):
    model_config = ConfigDict(extra="ignore")

    route_id: int = Field(description=f"Tram route, one of {ROUTES}")
    date: Date
    hour: int = Field(ge=0, le=23)
    boardings: float | None = Field(None, ge=0, description="Actual boardings; null for the hours to forecast")
    day_type: Literal["workday", "saturday", "sunday"] = Field(description="Production calendar day profile")
    is_dayoff: bool
    is_short_day: bool
    is_holiday: bool
    is_transfer_workday: bool
    temperature_c: float | None = None
    precipitation_mm: float | None = None
    snowfall_cm: float | None = None
    precip_type: Literal["none", "rain", "snow", "sleet", "hail"] | None = None
    wind_speed_ms: float | None = None
    humidity_pct: float | None = None
    cloud_cover_pct: float | None = None
    traffic_congestion_index: float | None = Field(None, description="2GIS travel time / free-flow time along the route")
    traffic_duration_s: float | None = None

    @model_validator(mode="after")
    def known_route(self) -> "FeatureRow":
        if self.route_id not in ROUTES:
            raise ValueError(f"unknown route_id {self.route_id}; expected one of {ROUTES}")
        return self


class PredictRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "model": "ensemble",
        "origin": "2025-11-01",
        "rows": [
            {"route_id": 17, "date": "2025-10-31", "hour": 8, "boardings": 5231, "day_type": "workday",
             "is_dayoff": False, "is_short_day": False, "is_holiday": False, "is_transfer_workday": False,
             "temperature_c": 3.1, "precipitation_mm": 0.0, "snowfall_cm": 0.0, "precip_type": "none",
             "wind_speed_ms": 2.4, "humidity_pct": 88, "cloud_cover_pct": 100,
             "traffic_congestion_index": 1.26, "traffic_duration_s": 1800},
            {"route_id": 17, "date": "2025-11-05", "hour": 8, "boardings": None, "day_type": "workday",
             "is_dayoff": False, "is_short_day": False, "is_holiday": False, "is_transfer_workday": False,
             "temperature_c": 1.5, "precipitation_mm": 0.2, "snowfall_cm": 0.1, "precip_type": "snow",
             "wind_speed_ms": 3.0, "humidity_pct": 91, "cloud_cover_pct": 100,
             "traffic_congestion_index": 1.26, "traffic_duration_s": 1800},
        ],
    }]})

    model: Literal["ensemble", "lightgbm", "pytorch", "baseline"] | None = Field(
        None, description="Model; default is the best one on the competition platform (ensemble)")
    origin: Date | None = Field(
        None, description="First forecast date. Default: the earliest date that has rows with boardings = null")
    rows: list[FeatureRow] = Field(
        min_length=1, max_length=MAX_ROWS,
        description="History with known boardings (56 days before origin are used) + rows to forecast (boardings = null)")

    @model_validator(mode="after")
    def consistent(self) -> "PredictRequest":
        keys = [(r.route_id, r.date, r.hour) for r in self.rows]
        if len(keys) != len(set(keys)):
            raise ValueError("duplicated (route_id, date, hour) rows")
        origin = self.origin or min((r.date for r in self.rows if r.boardings is None), default=None)
        if origin is None:
            raise ValueError("nothing to forecast: set origin or send rows with boardings = null")
        if not any(r.date >= origin for r in self.rows):
            raise ValueError(f"no rows on or after origin {origin}")
        return self


class Prediction(BaseModel):
    route_id: int
    date: Date
    hour: int
    prediction: float = Field(ge=0, description="Forecast boardings for the hour")


class PredictResponse(BaseModel):
    model: str
    origin: Date
    horizon_days: int = Field(description="Number of forecast dates")
    rows: int
    total_prediction: float
    warnings: list[str] = Field(default_factory=list)
    predictions: list[Prediction]


class HealthResponse(BaseModel):
    status: Literal["OK"]
    model_loaded: bool
    default_model: str
    trained_on: dict
    version: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict = Field(default_factory=dict)
    request_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody

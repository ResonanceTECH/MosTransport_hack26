"""Factors, model metadata, telemetry, saved scenarios and admin actions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel, Field

from app.api.deps import service
from app.core.auth import current_identity, require_admin
from app.core.exceptions import NotFoundException
from app.services import forecast as engine

router = APIRouter()

PRESETS = [
    {"id": "neutral", "name": "Без корректировок", "description": "Чистый прогноз модели",
     "coefficients": {"k_weather": 1.0, "k_event": 1.0, "k_season": 1.0, "k_traffic": 1.0}},
    {"id": "bad_weather", "name": "Непогода", "description": "Осадки и сильный ветер",
     "coefficients": {"k_weather": 1.25, "k_event": 1.0, "k_season": 1.0, "k_traffic": 1.15}},
    {"id": "city_event", "name": "Городское мероприятие", "description": "Массовое мероприятие рядом с маршрутом",
     "coefficients": {"k_weather": 1.0, "k_event": 1.35, "k_season": 1.0, "k_traffic": 1.2}},
    {"id": "summer_low", "name": "Летний спад", "description": "Период отпусков и школьных каникул",
     "coefficients": {"k_weather": 0.95, "k_event": 1.0, "k_season": 0.8, "k_traffic": 0.9}},
]

SOURCES = [
    {"name": "Open-Meteo", "url": "https://open-meteo.com/",
     "description": "Почасовой архив погоды: температура, осадки, ветер, облачность"},
    {"name": "Производственный календарь", "url": "https://github.com/isdayoff/calendars",
     "description": "Выходные, праздники, переносы и сокращённые дни"},
    {"name": "2GIS", "url": "https://docs.2gis.com/ru/api/navigation/directions/overview",
     "description": "Загруженность дорог вдоль маршрута"},
]


@router.get("/factors")
async def get_factors() -> dict:
    return {
        "presets": PRESETS,
        "sources": SOURCES,
        "defaults": {"k_weather": 1.0, "k_event": 1.0, "k_season": 1.0, "k_traffic": 1.0},
    }


@router.get("/model/info")
async def model_info(request: Request) -> dict:
    forecast_service = service(request)
    try:
        health = await forecast_service.ml.health()
    except Exception:
        health = {}
    trained_on = health.get("trained_on") or {}
    metrics = health.get("platform_scores") or {}
    wape = float(metrics.get(health.get("default_model", "ensemble"), 0.88265))
    coverage_from, coverage_to = await forecast_service.coverage(getattr(request.state, "request_id", None))
    return {
        "name": f"Прогноз посадок ({health.get('default_model', 'ensemble')})",
        "version": health.get("version", "1.0.0"),
        "trained_at": f"{trained_on.get('to', '2025-10-31')}T00:00:00+03:00",
        "wape": wape,
        "wape_by_horizon": {k: float(v) for k, v in metrics.items() if isinstance(v, (int, float))},
        "scope": (f"Трамвайные маршруты Москвы, почасовые посадки. "
                  f"Обучение: {trained_on.get('from', '2025-01-01')} — {trained_on.get('to', '2025-10-31')}. "
                  f"Данные в базе: {coverage_from} — {coverage_to}."),
        "limitations": [
            "Модель требует не менее 56 дней истории посадок до начала периода прогноза.",
            "Маршрут без посадок за 28 дней до начала периода получает нулевой прогноз.",
            "Прогноз строится на уровне маршрута и часа; значения по остановкам — распределение маршрутного "
            "прогноза по весам остановок, а не измеренный спрос.",
            "Коэффициенты k_* применяются после модели и не влияют на её входные данные.",
        ],
        "model_loaded": bool(health.get("model_loaded", False)),
    }


@router.post("/forecast/recompute", status_code=status.HTTP_202_ACCEPTED)
async def recompute(request: Request) -> dict:
    require_admin(request)
    result = await service(request).etl.trigger_ingest(
        force=False, request_id=getattr(request.state, "request_id", None))
    return {"job_id": str(uuid.uuid4()), "status": result.get("status", "started")}


class TelemetryEvent(BaseModel):
    type: str
    ts: datetime | None = None
    payload: dict = Field(default_factory=dict)


class TelemetryBatch(BaseModel):
    events: list[TelemetryEvent] = Field(default_factory=list, max_length=500)


@router.post("/telemetry", status_code=status.HTTP_204_NO_CONTENT)
async def telemetry(batch: TelemetryBatch, request: Request) -> Response:
    identity = current_identity(request)
    emitter = getattr(request.state, "emitter", None)
    for event in batch.events:
        if emitter is not None:
            emitter.emit("INFO", "frontend_telemetry", f"frontend event {event.type}",
                         request_id=getattr(request.state, "request_id", None),
                         user_id=identity.user_id, path="/api/v1/telemetry",
                         payload={"type": event.type,
                                  "ts": (event.ts or datetime.now(timezone.utc)).isoformat(),
                                  **event.payload})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


class ScenarioCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    coefficients: dict[str, float]


_SCENARIOS: dict[str, list[dict]] = {}


@router.get("/user-scenarios")
async def list_scenarios(request: Request) -> dict:
    identity = current_identity(request)
    return {"items": _SCENARIOS.get(identity.user_id or "anonymous", [])}


@router.post("/user-scenarios", status_code=status.HTTP_201_CREATED)
async def create_scenario(body: ScenarioCreate, request: Request) -> dict:
    identity = current_identity(request)
    user_id = identity.user_id or "anonymous"
    scenario = {
        "id": str(uuid.uuid4()), "user_id": user_id, "name": body.name,
        "coefficients": body.coefficients, "created_at": engine.iso_now(),
    }
    _SCENARIOS.setdefault(user_id, []).insert(0, scenario)
    return scenario


@router.delete("/user-scenarios/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(scenario_id: str, request: Request) -> Response:
    identity = current_identity(request)
    items = _SCENARIOS.get(identity.user_id or "anonymous", [])
    remaining = [item for item in items if item["id"] != scenario_id]
    if len(remaining) == len(items):
        raise NotFoundException("Сценарий не найден")
    _SCENARIOS[identity.user_id or "anonymous"] = remaining
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/runs")
async def recent_runs(request: Request, limit: int = 20) -> dict:
    require_admin(request)
    runs = await service(request).etl.recent_runs(limit, getattr(request.state, "request_id", None))
    return {"items": runs}

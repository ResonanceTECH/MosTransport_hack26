"""Factors API - external data sources and coefficient presets."""

from fastapi import APIRouter, Request

router = APIRouter()

# TODO: Load from etl/sources.yaml
SOURCES = [
    {
        "id": "calendar",
        "name": "Производственный календарь",
        "description": "Выходные, праздники, переносы, сокращённые дни",
        "url": "https://github.com/isdayoff/calendars",
        "env_var": None,
    },
    {
        "id": "weather",
        "name": "Яндекс Погода",
        "description": "Температура, осадки, снег, ветер по часам",
        "url": "https://yandex.ru/dev/weather/doc/ru/",
        "env_var": "YANDEX_WEATHER_API_KEY",
    },
    {
        "id": "traffic",
        "name": "Яндекс Карты (пробки)",
        "description": "Загруженность улиц по часам",
        "url": "https://yandex.ru/dev/maps/",
        "env_var": "YANDEX_MAPS_API_KEY",
    },
]

# TODO: Load from ML team
PRESETS = [
    {
        "name": "Дождь",
        "k_weather": 0.92,
        "k_event": 1.0,
        "k_season": 1.0,
        "k_traffic": 1.0,
        "explanation": "В дождливые часы пассажиропоток в среднем на 8% ниже",
    },
    {
        "name": "Снегопад",
        "k_weather": 0.85,
        "k_event": 1.0,
        "k_season": 1.0,
        "k_traffic": 1.1,
        "explanation": "В снегопад пассажиропotок ниже на 15%, пробки усиливаются",
    },
    {
        "name": "Праздник",
        "k_weather": 1.0,
        "k_event": 0.7,
        "k_season": 1.0,
        "k_traffic": 1.0,
        "explanation": "В праздничные дни пассажиропоток ниже на 30%",
    },
    {
        "name": "Массовое мероприятие",
        "k_weather": 1.0,
        "k_event": 1.3,
        "k_season": 1.0,
        "k_traffic": 1.2,
        "explanation": "В дни мероприятий пассажиропоток выше на 30%",
    },
]


@router.get("/factors")
async def get_factors(request: Request):
    """Get external factors and coefficient presets."""
    return {
        "sources": SOURCES,
        "presets": PRESETS,
        "request_id": getattr(request.state, "request_id", None),
    }

"""2GIS / Yandex Maps traffic API integration."""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# 2GIS API endpoint for traffic data
DGIS_TRAFFIC_URL = "https://catalog.api.2gis.ru/3.0/items"


async def fetch_traffic_data(
    lat: float = 55.7558,
    lon: float = 37.6173,
    radius: int = 5000,
) -> Optional[dict]:
    """Fetch traffic data from 2GIS API."""
    if not settings.YANDEX_MAPS_API_KEY:
        logger.warning("YANDEX_MAPS_API_KEY not set, skipping traffic fetch")
        return None

    params = {
        "q": f"{lat},{lon}",
        "radius": radius,
        "type": "street,adm_div",
        "fields": "items.geometry,items.attributes.traffic",
        "key": settings.YANDEX_MAPS_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(DGIS_TRAFFIC_URL, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch traffic data: {e}")
        return None


async def fetch_traffic_history(
    start_date: str = "2025-01-01",
    end_date: str = "2025-10-31",
) -> Optional[list]:
    """Fetch historical traffic data.

    Note: 2GIS API does not provide historical traffic data.
    For training, use alternative sources or describe limitation in README.
    """
    logger.info(
        "2GIS API does not provide historical traffic data. "
        "This source is only for current situation."
    )
    return None

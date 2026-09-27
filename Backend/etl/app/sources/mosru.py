"""Data.mos.ru API integration (stub).

This is the most complex integration and is marked as optional in the TODO.
For now, we provide a stub that can be implemented later.
"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

MOSRU_API_URL = "https://api.data.mos.ru/v1"


async def fetch_stops() -> Optional[list]:
    """Fetch stops data from data.mos.ru."""
    if not settings.MOSRU_API_KEY:
        logger.warning("MOSRU_API_KEY not set, skipping data.mos.ru fetch")
        return None

    # TODO: Implement actual API integration
    # This requires:
    # 1. Authentication with API key
    # 2. Pagination through results
    # 3. Mapping to our stops table
    logger.info("data.mos.ru integration not yet implemented (optional)")
    return None


async def fetch_route_info(route_id: str) -> Optional[dict]:
    """Fetch route information from data.mos.ru."""
    if not settings.MOSRU_API_KEY:
        return None

    # TODO: Implement actual API integration
    return None


async def fetch_road_works() -> Optional[list]:
    """Fetch road works and closures from data.mos.ru."""
    if not settings.MOSRU_API_KEY:
        return None

    # TODO: Implement actual API integration
    return None

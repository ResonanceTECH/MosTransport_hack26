"""Database connection pool for ETL."""

import logging
from contextlib import asynccontextmanager

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Get or create connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=2,
            max_size=10,
        )
        logger.info("Database connection pool created")
    return _pool


async def close_pool():
    """Close connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


@asynccontextmanager
async def get_connection():
    """Get connection from pool."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

"""asyncpg pool for the service database."""

from __future__ import annotations

import asyncio
import json
import logging

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)
_pool: asyncpg.Pool | None = None


async def _init_connection(connection: asyncpg.Connection) -> None:
    await connection.set_type_codec("jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
    await connection.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


async def connect(retries: int = 30, delay: float = 2.0) -> asyncpg.Pool:
    """Open the pool, waiting for PostgreSQL to accept connections."""
    global _pool
    if _pool is not None:
        return _pool
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            _pool = await asyncpg.create_pool(
                dsn=settings.SERVICE_DATABASE_URL,
                min_size=settings.DB_POOL_MIN,
                max_size=settings.DB_POOL_MAX,
                command_timeout=120,
                init=_init_connection,
            )
            logger.info("service database pool ready")
            return _pool
        except Exception as exc:
            last_error = exc
            logger.warning("service database not ready (attempt %s/%s): %s", attempt, retries, type(exc).__name__)
            await asyncio.sleep(delay)
    raise RuntimeError(f"cannot connect to the service database: {last_error!r}")


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("database pool is not initialised")
    return _pool


async def close() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

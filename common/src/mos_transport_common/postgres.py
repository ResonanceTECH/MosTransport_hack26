"""Optional psycopg-backed INSERT-only sink for the Logs DB contract."""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any


class PostgresBatchSink:
    """Insert a batch using a short-lived connection and logs_writer credentials."""

    def __init__(self, conninfo: Mapping[str, str]) -> None:
        self._conninfo = dict(conninfo)

    @classmethod
    def from_env(cls) -> "PostgresBatchSink":
        names = {
            "host": "LOGS_DB_HOST",
            "port": "LOGS_DB_PORT",
            "dbname": "LOGS_DB_NAME",
            "user": "LOGS_WRITER_USER",
            "password": "LOGS_WRITER_PASSWORD",
        }
        missing = [env_name for env_name in names.values() if not os.getenv(env_name)]
        if missing:
            raise ValueError("missing required Logs DB environment variables: " + ", ".join(missing))
        return cls({key: os.environ[env_name] for key, env_name in names.items()})

    def __call__(self, records: list[Mapping[str, Any]]) -> None:
        try:
            import psycopg
            from psycopg.types.json import Jsonb
        except ImportError as exc:
            raise RuntimeError("PostgreSQL logging requires the optional 'postgres' extra") from exc

        sql = """INSERT INTO public.logs
            (ts, service, level, request_id, user_id, event, message,
             method, path, status, latency_ms, payload)
            VALUES (%(ts)s, %(service)s, %(level)s, %(request_id)s, %(user_id)s,
                    %(event)s, %(message)s, %(method)s, %(path)s, %(status)s,
                    %(latency_ms)s, %(payload)s)"""
        values = [{**record, "payload": Jsonb(record["payload"])} for record in records]
        with psycopg.connect(**self._conninfo) as connection:
            with connection.cursor() as cursor:
                cursor.executemany(sql, values)

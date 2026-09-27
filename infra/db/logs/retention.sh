#!/bin/sh
set -eu

: "${LOGS_DB_HOST:?Set LOGS_DB_HOST}"
: "${LOGS_DB_NAME:?Set LOGS_DB_NAME}"
: "${LOGS_MAINTENANCE_USER:?Set LOGS_MAINTENANCE_USER}"
: "${LOGS_MAINTENANCE_PASSWORD:?Set LOGS_MAINTENANCE_PASSWORD}"

LOGS_DB_PORT="${LOGS_DB_PORT:-5432}"
LOGS_RETENTION_INTERVAL_SECONDS="${LOGS_RETENTION_INTERVAL_SECONDS:-3600}"
LOGS_RETENTION_HEARTBEAT_FILE="${LOGS_RETENTION_HEARTBEAT_FILE:-/tmp/logs-retention-last-success}"
case "$LOGS_DB_PORT" in ''|*[!0-9]*) echo "LOGS_DB_PORT must be an integer" >&2; exit 2 ;; esac
case "$LOGS_RETENTION_INTERVAL_SECONDS" in ''|*[!0-9]*) echo "LOGS_RETENTION_INTERVAL_SECONDS must be an integer" >&2; exit 2 ;; esac
if [ "$LOGS_DB_PORT" -lt 1 ] || [ "$LOGS_DB_PORT" -gt 65535 ] ||
   [ "$LOGS_RETENTION_INTERVAL_SECONDS" -lt 1 ]; then
    echo "LOGS_DB_PORT and LOGS_RETENTION_INTERVAL_SECONDS must be positive valid integers" >&2
    exit 2
fi

export PGHOST="$LOGS_DB_HOST"
export PGPORT="$LOGS_DB_PORT"
export PGDATABASE="$LOGS_DB_NAME"
export PGUSER="$LOGS_MAINTENANCE_USER"
export PGPASSWORD="$LOGS_MAINTENANCE_PASSWORD"
export PGCONNECT_TIMEOUT="${LOGS_DB_CONNECT_TIMEOUT_SECONDS:-5}"
export PGOPTIONS="-c statement_timeout=60000"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BATCH_SQL="$SCRIPT_DIR/delete_expired_batch.sql"

while :; do
    while :; do
        deleted=$(psql --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align --file="$BATCH_SQL")
        case "$deleted" in ''|*[!0-9]*)
            echo "Retention batch returned a non-numeric row count; refusing to continue" >&2
            exit 1
            ;;
        esac
        printf 'logs retention: deleted %s expired rows\n' "$deleted"
        date +%s > "$LOGS_RETENTION_HEARTBEAT_FILE"
        if [ "$deleted" -lt 10000 ]; then
            break
        fi
        sleep 1
    done
    sleep "$LOGS_RETENTION_INTERVAL_SECONDS"
done

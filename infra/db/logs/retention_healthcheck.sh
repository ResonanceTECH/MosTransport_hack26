#!/bin/sh
set -eu

: "${LOGS_RETENTION_HEARTBEAT_FILE:?Set LOGS_RETENTION_HEARTBEAT_FILE}"
: "${LOGS_RETENTION_INTERVAL_SECONDS:?Set LOGS_RETENTION_INTERVAL_SECONDS}"
case "$LOGS_RETENTION_INTERVAL_SECONDS" in ''|*[!0-9]*) exit 1 ;; esac
[ -r "$LOGS_RETENTION_HEARTBEAT_FILE" ] || exit 1
last_success=$(cat "$LOGS_RETENTION_HEARTBEAT_FILE")
case "$last_success" in ''|*[!0-9]*) exit 1 ;; esac
now=$(date +%s)
max_age=$((LOGS_RETENTION_INTERVAL_SECONDS * 2 + 60))
[ "$last_success" -le "$now" ] && [ "$((now - last_success))" -le "$max_age" ]

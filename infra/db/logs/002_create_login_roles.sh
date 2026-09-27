#!/bin/sh
set -eu

: "${LOGS_WRITER_USER:?Set LOGS_WRITER_USER}"
: "${LOGS_WRITER_PASSWORD:?Set LOGS_WRITER_PASSWORD}"
: "${LOGS_GRAFANA_USER:?Set LOGS_GRAFANA_USER}"
: "${LOGS_GRAFANA_PASSWORD:?Set LOGS_GRAFANA_PASSWORD}"
: "${LOGS_MAINTENANCE_USER:?Set LOGS_MAINTENANCE_USER}"
: "${LOGS_MAINTENANCE_PASSWORD:?Set LOGS_MAINTENANCE_PASSWORD}"

# psql quotes passwords as literals and role names as identifiers.
# Suppress generated CREATE ROLE statements so passwords never appear in init logs.
psql --no-psqlrc --set=ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=writer_user="$LOGS_WRITER_USER" \
    --set=writer_password="$LOGS_WRITER_PASSWORD" \
    --set=grafana_user="$LOGS_GRAFANA_USER" \
    --set=grafana_password="$LOGS_GRAFANA_PASSWORD" \
    --set=maintenance_user="$LOGS_MAINTENANCE_USER" \
    --set=maintenance_password="$LOGS_MAINTENANCE_PASSWORD" <<'SQL'
\o /dev/null
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'writer_user', :'writer_password') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'grafana_user', :'grafana_password') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'maintenance_user', :'maintenance_password') \gexec
\o
GRANT logs_writer TO :"writer_user";
GRANT grafana_ro TO :"grafana_user";
GRANT logs_maintenance TO :"maintenance_user";
SQL

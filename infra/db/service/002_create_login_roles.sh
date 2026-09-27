#!/bin/sh
# Create least-privilege login roles for the service database.
# Passwords come from the environment so they are never written into the image.
set -eu

for var in SERVICE_ETL_USER SERVICE_ETL_PASSWORD \
           SERVICE_BACKEND_USER SERVICE_BACKEND_PASSWORD \
           SERVICE_GRAFANA_USER SERVICE_GRAFANA_PASSWORD; do
    eval "value=\${$var:-}"
    if [ -z "$value" ]; then
        echo "service-db init: $var is not set" >&2
        exit 1
    fi
done

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     --port "${SERVICE_DB_PORT:-1030}" \
     -v etl_user="$SERVICE_ETL_USER" -v etl_password="$SERVICE_ETL_PASSWORD" \
     -v backend_user="$SERVICE_BACKEND_USER" -v backend_password="$SERVICE_BACKEND_PASSWORD" \
     -v grafana_user="$SERVICE_GRAFANA_USER" -v grafana_password="$SERVICE_GRAFANA_PASSWORD" <<'SQL'
BEGIN;

-- ETL owns ingestion: full read/write on the service tables.
CREATE ROLE :"etl_user" LOGIN PASSWORD :'etl_password';
GRANT USAGE ON SCHEMA public TO :"etl_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"etl_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"etl_user";

-- Backend reads reference/feature data and writes forecast + audit rows.
CREATE ROLE :"backend_user" LOGIN PASSWORD :'backend_password';
GRANT USAGE ON SCHEMA public TO :"backend_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"backend_user";
GRANT INSERT, UPDATE, DELETE ON
    public.forecast_runs, public.forecasts, public.predict_log,
    public.user_scenarios, public.telemetry_events
    TO :"backend_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"backend_user";

-- Grafana dashboards are read-only.
CREATE ROLE :"grafana_user" LOGIN PASSWORD :'grafana_password';
GRANT USAGE ON SCHEMA public TO :"grafana_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"grafana_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO :"backend_user", :"grafana_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"etl_user";

COMMIT;
SQL

echo "service-db init: login roles created"

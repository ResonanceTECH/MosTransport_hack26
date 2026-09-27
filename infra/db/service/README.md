# Service DB — product data store

PostgreSQL stores source/normalized data, target series, model features, prediction runs, forecasts and quality metrics. The predictor itself and its model artifacts belong to ML (Arthur), not PostgreSQL. The ML service is not yet ready; its DB role contract is prepared, but service URL, credentials, startup dependency and readiness check remain TBD until Arthur's module exists.

## Service map and internal ports

All ports below are internal container/service ports supplied by Arthur; this module defines no host port publishing.

| Component | Internal port | Connection and responsibility | Status |
| --- | ---: | --- | --- |
| Frontend | 443 | Browser/UI → Backend public API; no direct DB access | owner Dasha; integrate in common Compose |
| Backend | 1000 | API → ETL; direct DB read disabled unless separately approved | owner Mark |
| ETL | 1010 | reads/writes service data; DNS alias and DB URL TBD in common Compose | owner Mark |
| ML predictor | 1020 | reads features; writes runs/forecasts/metrics; module not ready, contract pending | owner Arthur |
| Service PostgreSQL | 1030 | service name service-db; ETL/ML/Grafana only inside shared Docker network | this module |
| Logs PostgreSQL | 8000 | separate database/service; /common writer and Grafana read-only | separate module |
| Prometheus | 8010 | scrapes internal /metrics and exporters | observability module pending |
| Grafana | 8020 | dashboards; uses least-privilege DB readers | provisioning pending |

The Compose file here is a standalone DB component, with no published ports. When joined to the application stack, attach service-db to the same private application network and use service-db:1030. Do not create a second database container if the common stack already owns the product DB; merge the service definition/migrations with its owner instead.

## Schema and producer/consumer links

Apply migrations in numeric order on an empty PostgreSQL 16 volume:

| Migration | Objects |
| --- | --- |
| 001_service_schema.sql | reference tables; validations partitioned by month range with DEFAULT child; schedule, telematics; target_hourly; ext_weather_hourly, ext_traffic_hourly, ext_calendar_days, ext_events; features_hourly; forecast_runs, forecasts, model_metrics |
| 002_grants.sql | NOLOGIN role groups etl_rw, ml_rw, grafana_ro and least-privilege table grants |
| 003_views.sql | hourly, stop, map, route/day, route/month materialized views and unique indexes |
| 004_functions.sql | route-segment sum helper and controlled refresh function |

| Flow | Tables/contract | Access |
| --- | --- | --- |
| Mark's ETL → Service DB | validations, schedule, telematics, reference data, target_hourly, ext_* and features_hourly | etl_rw read/write these objects; may read forecasts |
| Arthur's ML → Service DB | features_hourly and source tables → forecast_runs, forecasts, model_metrics | ml_rw read source/features and write output; integration TBD until ML block is available |
| Backend → DB | no direct connection by default; preferred API path is Backend → ETL | backend_ro not granted |
| Grafana → DB | selected sources, metrics, forecast outputs and views | grafana_ro SELECT only |
| ETL batch → views | call refresh function after forecasts are committed | etl_rw may execute; views support concurrent refresh |

All time values are timestamptz and should be presented in Europe/Moscow. Forecast indexes follow the agreed filters: (horizon, route_id, ts) and (horizon, stop_id, ts); target key is (route_id, stop_id, ts_hour). Segment aggregation sums stop forecasts between inclusive route-order boundaries for a route direction.

The TЗ does not provide typed source columns for schedule/telematics, full feature dictionary, or external provider payloads. Those landing payloads remain JSONB with source/fetched_at metadata; no final source schema is guessed. Mark must provide mapping/units/date range/granularity; Arthur must provide feature names/types, forecast horizon values, and ML readiness/DB URL. Convert to typed columns in a later migration after confirmation.

## Credentials and resource settings

Only the initial DB administrator comes from the local untracked .env. Application group roles are NOLOGIN; login credentials should be created by the shared-stack owner in its secret environment and granted membership, never committed. Do not use the admin/superuser in applications. backend_ro is intentionally not created. .env.example contains non-working placeholders only; .env is ignored by Git.

PostgreSQL defaults document the TЗ tuning knobs: shared_buffers=256MB, work_mem=4MB, effective_cache_size=768MB, max_connections=40. The container has a 1 GiB memory limit, equal memswap limit (swap disabled), and 1 CPU. Revisit these defaults against the full stack memory budget before integration.

## Configure and validate

Before any server operation, confirm only our path, branch and status:

~~~bash
cd /home/aristarkhshavreev/MosTransport_hack26_db_observability
pwd
git branch --show-current
git status
~~~

For local config validation (no containers are started):

~~~bash
sudo docker compose --env-file infra/db/service/.env.example -f infra/db/service/compose.yaml config -q
~~~

For an isolated disposable PostgreSQL 16 test, do not publish a port or mount a persistent volume; apply all four SQL files and check pg_isready, tables, roles, privileges, and a sample forecast/view refresh. The shared team's running DB/Compose is not mutated by this test or by this standalone module. Initialization files run only on an empty volume; use explicit reviewed migrations for an existing database and coordinate with its owner first.

## Operational checks after common-stack integration

Use the agreed internal DNS and port, never a host-published database port:

~~~bash
pg_isready -h service-db -p 1030 -d transport
psql "$SERVICE_DATABASE_URL" -v ON_ERROR_STOP=1 -c '\\dt+'
psql "$SERVICE_DATABASE_URL" -v ON_ERROR_STOP=1 -c '\\dm+'
psql "$SERVICE_DATABASE_URL" -v ON_ERROR_STOP=1 -c '\\dp'
~~~

Do not print the connection URL. Negative permission checks: Grafana INSERT/UPDATE/DELETE must fail; ETL must not write forecast output; ML must not modify source data; Backend access is absent unless separately approved. Test end-to-end predictor readiness only after Arthur supplies the real ML module and connection contract.

Logs DB remains a separate observability store: [Logs DB runbook](../logs/README.md).

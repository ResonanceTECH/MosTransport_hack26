BEGIN;
DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='etl_rw') THEN CREATE ROLE etl_rw NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ml_rw') THEN CREATE ROLE ml_rw NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='grafana_ro') THEN CREATE ROLE grafana_ro NOLOGIN; END IF;
END
$roles$;
GRANT USAGE ON SCHEMA public TO etl_rw,ml_rw,grafana_ro;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.routes,public.stops,public.route_stops,
 public.route_geometry,public.validations,public.schedule,public.telematics,
 public.target_hourly,public.ext_weather_hourly,public.ext_traffic_hourly,
 public.ext_calendar_days,public.ext_events,public.features_hourly TO etl_rw;
GRANT SELECT ON public.forecast_runs,public.forecasts TO etl_rw;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO etl_rw;
GRANT SELECT ON public.routes,public.stops,public.route_stops,public.route_geometry,
 public.validations,public.schedule,public.telematics,public.target_hourly,
 public.ext_weather_hourly,public.ext_traffic_hourly,public.ext_calendar_days,
 public.ext_events,public.features_hourly TO ml_rw;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.forecast_runs,public.forecasts,public.model_metrics TO ml_rw;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO ml_rw;
GRANT SELECT ON public.routes,public.stops,public.route_stops,public.route_geometry,
 public.target_hourly,public.features_hourly,public.forecast_runs,public.forecasts,
 public.model_metrics TO grafana_ro;
COMMIT;

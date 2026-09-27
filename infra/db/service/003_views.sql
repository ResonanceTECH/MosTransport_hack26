BEGIN;
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_forecast_route_hour AS
 SELECT route_id,ts,sum(value)::numeric(14,3) AS value FROM public.forecasts
 WHERE route_id IS NOT NULL AND stop_id IS NOT NULL GROUP BY route_id,ts WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_forecast_route_hour_uidx ON public.mv_forecast_route_hour(route_id,ts);
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_forecast_stop_hour AS
 SELECT route_id,stop_id,ts,sum(value)::numeric(14,3) AS value FROM public.forecasts
 WHERE stop_id IS NOT NULL GROUP BY route_id,stop_id,ts WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_forecast_stop_hour_uidx ON public.mv_forecast_stop_hour(route_id,stop_id,ts);
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_forecast_route_day AS
 SELECT route_id,(date_trunc('day',ts AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow') AS ts,
 sum(value)::numeric(14,3) AS value FROM public.forecasts WHERE route_id IS NOT NULL AND stop_id IS NOT NULL
 GROUP BY route_id,date_trunc('day',ts AT TIME ZONE 'Europe/Moscow') WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_forecast_route_day_uidx ON public.mv_forecast_route_day(route_id,ts);
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_forecast_route_month AS
 SELECT route_id,(date_trunc('month',ts AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow') AS ts,
 sum(value)::numeric(14,3) AS value FROM public.forecasts WHERE route_id IS NOT NULL AND stop_id IS NOT NULL
 GROUP BY route_id,date_trunc('month',ts AT TIME ZONE 'Europe/Moscow') WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_forecast_route_month_uidx ON public.mv_forecast_route_month(route_id,ts);
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_forecast_map_hour AS
 SELECT route_id,stop_id,ts,sum(value)::numeric(14,3) AS value FROM public.forecasts
 WHERE stop_id IS NOT NULL GROUP BY route_id,stop_id,ts WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_forecast_map_hour_uidx ON public.mv_forecast_map_hour(route_id,stop_id,ts);
GRANT SELECT ON public.mv_forecast_route_hour,public.mv_forecast_stop_hour,
 public.mv_forecast_route_day,public.mv_forecast_route_month,public.mv_forecast_map_hour TO grafana_ro;
COMMIT;

CREATE OR REPLACE FUNCTION public.forecast_segment(
 p_route_id varchar(10),p_direction varchar(20),p_from_stop_id varchar(20),
 p_to_stop_id varchar(20),p_ts_from timestamptz,p_ts_to timestamptz
) RETURNS TABLE(ts timestamptz,value numeric)
LANGUAGE sql STABLE AS $function$
 WITH bounds AS (
  SELECT min(stop_order) lo,max(stop_order) hi FROM public.route_stops
  WHERE route_id=p_route_id AND direction=p_direction
   AND stop_id IN (p_from_stop_id,p_to_stop_id)
  HAVING count(DISTINCT stop_id)=2
 )
 SELECT f.ts,sum(f.value)::numeric(14,3)
 FROM public.forecasts f JOIN public.route_stops rs
  ON rs.route_id=f.route_id AND rs.stop_id=f.stop_id AND rs.direction=p_direction
 CROSS JOIN bounds b
 WHERE f.route_id=p_route_id AND f.stop_id IS NOT NULL
  AND rs.stop_order BETWEEN b.lo AND b.hi AND f.ts BETWEEN p_ts_from AND p_ts_to
 GROUP BY f.ts ORDER BY f.ts
$function$;
GRANT EXECUTE ON FUNCTION public.forecast_segment(varchar,varchar,varchar,varchar,timestamptz,timestamptz) TO etl_rw;
CREATE OR REPLACE FUNCTION public.refresh_forecast_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
DECLARE v text; populated boolean;
BEGIN
 FOREACH v IN ARRAY ARRAY['mv_forecast_route_hour','mv_forecast_stop_hour',
  'mv_forecast_route_day','mv_forecast_route_month','mv_forecast_map_hour'] LOOP
  SELECT c.relispopulated INTO populated FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=v;
  IF populated THEN EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY public.%I',v);
  ELSE EXECUTE format('REFRESH MATERIALIZED VIEW public.%I',v); END IF;
 END LOOP;
END
$function$;
GRANT EXECUTE ON FUNCTION public.refresh_forecast_views() TO etl_rw;

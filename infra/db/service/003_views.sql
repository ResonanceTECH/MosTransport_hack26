-- Read-only aggregates used by Grafana dashboards and the admin screens.
BEGIN;

CREATE OR REPLACE VIEW public.v_latest_forecast AS
SELECT DISTINCT ON (f.route_id, f.date, f.hour)
       f.route_id, f.date, f.hour, f.prediction,
       r.run_id, r.model, r.created_at
FROM public.forecasts f
JOIN public.forecast_runs r USING (run_id)
ORDER BY f.route_id, f.date, f.hour, r.created_at DESC;

CREATE OR REPLACE VIEW public.v_forecast_vs_actual AS
SELECT v.route_id, v.date, v.hour, v.prediction, h.boardings AS actual,
       CASE WHEN h.boardings IS NULL OR h.boardings = 0 THEN NULL
            ELSE abs(v.prediction - h.boardings) / h.boardings END AS abs_pct_error
FROM public.v_latest_forecast v
LEFT JOIN public.features_hourly h
       ON h.route_id = v.route_id AND h.date = v.date AND h.hour = v.hour;

CREATE OR REPLACE VIEW public.v_prediction_activity AS
SELECT date_trunc('minute', ts) AS minute,
       service,
       count(*)                                        AS requests,
       count(*) FILTER (WHERE cache_hit)               AS cache_hits,
       count(*) FILTER (WHERE http_status >= 500)      AS server_errors,
       avg(latency_ms)                                 AS avg_latency_ms,
       max(latency_ms)                                 AS max_latency_ms,
       sum(rows_out)                                   AS rows_predicted
FROM public.predict_log
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.v_data_coverage AS
SELECT route_id,
       split,
       min(date)                                   AS date_from,
       max(date)                                   AS date_to,
       count(*)                                    AS rows_total,
       count(*) FILTER (WHERE boardings IS NULL)   AS rows_to_forecast,
       sum(boardings)                              AS boardings_total
FROM public.features_hourly
GROUP BY route_id, split;

COMMIT;

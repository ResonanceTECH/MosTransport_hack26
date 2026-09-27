-- Logs DB schema and least-privilege group roles (PostgreSQL 16).
-- Apply once to the dedicated logs database as its owner/superuser.
BEGIN;

CREATE TABLE IF NOT EXISTS public.logs (
    ts          timestamptz NOT NULL DEFAULT now(),
    service     text NOT NULL CHECK (service IN ('backend', 'etl', 'ml', 'frontend')),
    level       text NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR')),
    request_id  uuid NOT NULL,
    user_id     text,
    event       text NOT NULL,
    message     text NOT NULL,
    method      text,
    path        text,
    status      integer CHECK (status IS NULL OR status BETWEEN 100 AND 599),
    latency_ms  double precision CHECK (latency_ms IS NULL OR latency_ms >= 0),
    payload     jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS logs_ts_idx ON public.logs (ts);
CREATE INDEX IF NOT EXISTS logs_service_ts_idx ON public.logs (service, ts);
CREATE INDEX IF NOT EXISTS logs_request_id_idx ON public.logs (request_id);
CREATE INDEX IF NOT EXISTS logs_level_ts_idx ON public.logs (level, ts);

DO $roles$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'logs_writer') THEN
        CREATE ROLE logs_writer NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'grafana_ro') THEN
        CREATE ROLE grafana_ro NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'logs_maintenance') THEN
        CREATE ROLE logs_maintenance NOLOGIN;
    END IF;
END
$roles$;

ALTER ROLE logs_writer NOLOGIN;
ALTER ROLE grafana_ro NOLOGIN;
ALTER ROLE logs_maintenance NOLOGIN;

CREATE OR REPLACE FUNCTION public.delete_expired_logs_batch()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
    deleted_count integer;
BEGIN
    WITH candidates AS (
        SELECT ctid
        FROM public.logs
        WHERE ts < statement_timestamp() - interval '7 days'
        ORDER BY ts
        LIMIT 10000
    )
    DELETE FROM public.logs AS logs
    USING candidates
    WHERE logs.ctid = candidates.ctid;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END
$function$;

REVOKE ALL ON FUNCTION public.delete_expired_logs_batch() FROM PUBLIC;
REVOKE ALL ON TABLE public.logs FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO logs_writer, grafana_ro, logs_maintenance;
GRANT INSERT ON TABLE public.logs TO logs_writer;
GRANT SELECT ON TABLE public.logs TO grafana_ro;
REVOKE ALL ON TABLE public.logs FROM logs_maintenance;
GRANT EXECUTE ON FUNCTION public.delete_expired_logs_batch() TO logs_maintenance;

COMMIT;

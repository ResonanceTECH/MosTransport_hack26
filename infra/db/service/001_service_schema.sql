-- PostgreSQL 16 service store for the passenger flow forecasting stack.
--
-- features_hourly is deliberately flat: the first block holds exactly the 18
-- fields of the ML /predict FeatureRow schema, the second block holds extra
-- columns that exist only in the database. Backend may filter on the extra
-- columns but must never forward them to the ML service.
BEGIN;

CREATE TABLE IF NOT EXISTS public.routes (
    route_id    integer PRIMARY KEY,
    number      text NOT NULL,
    name        text NOT NULL,
    color       varchar(7) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stops (
    stop_id     text PRIMARY KEY,
    route_id    integer NOT NULL REFERENCES public.routes(route_id) ON DELETE CASCADE,
    name        text NOT NULL,
    latitude    numeric(10,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude   numeric(11,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    sequence    integer NOT NULL CHECK (sequence > 0),
    -- Share of the route hourly boardings attributed to this stop; sums to 1 per route.
    load_weight numeric(8,6) NOT NULL CHECK (load_weight >= 0),
    UNIQUE (route_id, sequence)
);
CREATE INDEX IF NOT EXISTS stops_route_idx ON public.stops (route_id, sequence);

CREATE TABLE IF NOT EXISTS public.route_geometry (
    route_id   integer PRIMARY KEY REFERENCES public.routes(route_id) ON DELETE CASCADE,
    geometry   jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.features_hourly (
    route_id                  integer NOT NULL REFERENCES public.routes(route_id) ON DELETE CASCADE,
    date                      date NOT NULL,
    hour                      smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),

    -- ---- ML /predict FeatureRow schema: these 18 columns and nothing else ----
    boardings                 real CHECK (boardings IS NULL OR boardings >= 0),
    day_type                  text NOT NULL CHECK (day_type IN ('workday','saturday','sunday')),
    is_dayoff                 boolean NOT NULL,
    is_short_day              boolean NOT NULL,
    is_holiday                boolean NOT NULL,
    is_transfer_workday       boolean NOT NULL,
    temperature_c             real,
    precipitation_mm          real,
    snowfall_cm               real,
    precip_type               text CHECK (precip_type IS NULL OR precip_type IN ('none','rain','snow','sleet','hail')),
    wind_speed_ms             real,
    humidity_pct              real,
    cloud_cover_pct           real,
    traffic_congestion_index  real,
    traffic_duration_s        real,

    -- ---- extra columns: filterable in the UI, never sent to the ML service ----
    ts_hour                   timestamptz NOT NULL,
    split                     text NOT NULL CHECK (split IN ('train','test','forecast')),
    day_of_week               smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    month                     smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
    feels_like_c              real,
    weather_condition         text,
    weather_source            text,
    weather_is_forecast       boolean,
    is_saturday_profile       real,
    is_sunday_profile         real,
    is_rain                   real,
    is_snow                   real,

    PRIMARY KEY (route_id, date, hour)
);
CREATE INDEX IF NOT EXISTS features_hourly_date_idx ON public.features_hourly (date, hour);
CREATE INDEX IF NOT EXISTS features_hourly_split_idx ON public.features_hourly (split, date);
CREATE INDEX IF NOT EXISTS features_hourly_weather_idx ON public.features_hourly (weather_condition);
CREATE INDEX IF NOT EXISTS features_hourly_daytype_idx ON public.features_hourly (day_type);

-- One row per ML inference triggered from the Backend.
CREATE TABLE IF NOT EXISTS public.forecast_runs (
    run_id            uuid PRIMARY KEY,
    created_at        timestamptz NOT NULL DEFAULT now(),
    request_id        uuid,
    user_id           text,
    model             text NOT NULL,
    model_version     text,
    origin            date NOT NULL,
    date_from         date NOT NULL,
    date_to           date NOT NULL,
    horizon           text NOT NULL,
    horizon_days      integer NOT NULL CHECK (horizon_days >= 0),
    rows_predicted    integer NOT NULL CHECK (rows_predicted >= 0),
    rows_sent         integer NOT NULL CHECK (rows_sent >= 0),
    total_prediction  numeric(16,3) NOT NULL CHECK (total_prediction >= 0),
    ml_latency_ms     double precision CHECK (ml_latency_ms IS NULL OR ml_latency_ms >= 0),
    cache_key         text NOT NULL,
    routes            integer[] NOT NULL,
    filters           jsonb NOT NULL DEFAULT '{}'::jsonb,
    coefficients      jsonb NOT NULL DEFAULT '{}'::jsonb,
    warnings          jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS forecast_runs_cache_idx ON public.forecast_runs (cache_key, created_at DESC);
CREATE INDEX IF NOT EXISTS forecast_runs_created_idx ON public.forecast_runs (created_at DESC);

-- Per-hour predictions returned by the ML service, kept for reuse and audit.
CREATE TABLE IF NOT EXISTS public.forecasts (
    run_id      uuid NOT NULL REFERENCES public.forecast_runs(run_id) ON DELETE CASCADE,
    route_id    integer NOT NULL,
    date        date NOT NULL,
    hour        smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
    prediction  numeric(14,3) NOT NULL CHECK (prediction >= 0),
    PRIMARY KEY (run_id, route_id, date, hour)
);
CREATE INDEX IF NOT EXISTS forecasts_route_date_idx ON public.forecasts (route_id, date, hour);

-- Compact audit trail of every inference request, alongside the logs database.
CREATE TABLE IF NOT EXISTS public.predict_log (
    id          bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    ts          timestamptz NOT NULL DEFAULT now(),
    service     text NOT NULL,
    request_id  uuid,
    run_id      uuid,
    endpoint    text NOT NULL,
    http_status integer,
    latency_ms  double precision,
    rows_sent   integer,
    rows_out    integer,
    cache_hit   boolean NOT NULL DEFAULT false,
    payload     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS predict_log_ts_idx ON public.predict_log (ts DESC);
CREATE INDEX IF NOT EXISTS predict_log_request_idx ON public.predict_log (request_id);

CREATE TABLE IF NOT EXISTS public.user_scenarios (
    id           uuid PRIMARY KEY,
    user_id      text NOT NULL,
    name         text NOT NULL,
    coefficients jsonb NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_scenarios_user_idx ON public.user_scenarios (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    ts         timestamptz NOT NULL DEFAULT now(),
    request_id uuid,
    user_id    text,
    name       text NOT NULL,
    payload    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS telemetry_events_ts_idx ON public.telemetry_events (ts DESC);

COMMIT;

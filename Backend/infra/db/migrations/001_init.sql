-- Moscow Transport Hack - Initial Database Schema
-- Service database for passenger flow forecasting

-- Create roles
CREATE ROLE etl_rw LOGIN PASSWORD 'etl_rw_pass';
CREATE ROLE ml_rw LOGIN PASSWORD 'ml_rw_pass';
CREATE ROLE grafana_ro LOGIN PASSWORD 'grafana_ro_pass';
CREATE ROLE backend_ro LOGIN PASSWORD 'backend_ro_pass';

-- Routes reference
CREATE TABLE routes (
    route_id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stops reference
CREATE TABLE stops (
    stop_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route stops (order of stops by direction)
CREATE TABLE route_stops (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(10) NOT NULL REFERENCES routes(route_id),
    direction VARCHAR(20) NOT NULL, -- 'forward', 'backward'
    stop_id VARCHAR(20) NOT NULL REFERENCES stops(stop_id),
    stop_order INT NOT NULL,
    UNIQUE(route_id, direction, stop_id)
);

-- Route geometry (GeoJSON)
CREATE TABLE route_geometry (
    route_id VARCHAR(10) PRIMARY KEY REFERENCES routes(route_id),
    direction VARCHAR(20) NOT NULL,
    geometry JSONB NOT NULL, -- GeoJSON LineString
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validations (raw data)
CREATE TABLE validations (
    tran_no VARCHAR(50) PRIMARY KEY,
    device_no VARCHAR(50),
    tran_date_time TIMESTAMPTZ NOT NULL,
    crd_hashcode VARCHAR(100),
    validation_result INT NOT NULL,
    tran_type_id INT,
    place_id VARCHAR(20),
    good_type VARCHAR(100),
    ngpt_route VARCHAR(50),
    route_id VARCHAR(10),
    bus_exit_no VARCHAR(20),
    garage_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (tran_date_time);

-- Create partitions for validations
CREATE TABLE validations_2025_01 PARTITION OF validations
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE validations_2025_02 PARTITION OF validations
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE validations_2025_03 PARTITION OF validations
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE validations_2025_04 PARTITION OF validations
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE validations_2025_05 PARTITION OF validations
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE validations_2025_06 PARTITION OF validations
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE validations_2025_07 PARTITION OF validations
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE validations_2025_08 PARTITION OF validations
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE validations_2025_09 PARTITION OF validations
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE validations_2025_10 PARTITION OF validations
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Target hourly (aggregated boardings)
CREATE TABLE target_hourly (
    route_id VARCHAR(10) NOT NULL,
    stop_id VARCHAR(20),
    ts_hour TIMESTAMPTZ NOT NULL,
    passengers INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (route_id, ts_hour)
);

-- External weather data
CREATE TABLE ext_weather_hourly (
    id SERIAL PRIMARY KEY,
    ts_hour TIMESTAMPTZ NOT NULL,
    temperature DECIMAL(5, 2),
    precipitation DECIMAL(5, 2),
    snow BOOLEAN DEFAULT FALSE,
    wind_speed DECIMAL(5, 2),
    source VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ts_hour, source)
);
CREATE INDEX idx_ext_weather_hourly_ts ON ext_weather_hourly(ts_hour);
CREATE INDEX idx_ext_weather_hourly_source ON ext_weather_hourly(source);

-- External traffic data
CREATE TABLE ext_traffic_hourly (
    id SERIAL PRIMARY KEY,
    ts_hour TIMESTAMPTZ NOT NULL,
    congestion_level DECIMAL(3, 2), -- 0.0 - 1.0
    source VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ts_hour, source)
);
CREATE INDEX idx_ext_traffic_hourly_ts ON ext_traffic_hourly(ts_hour);

-- Calendar days
CREATE TABLE ext_calendar_days (
    date DATE PRIMARY KEY,
    day_type VARCHAR(20) NOT NULL, -- 'weekday', 'weekend', 'holiday', 'school_holiday'
    is_working BOOLEAN NOT NULL,
    holiday_name VARCHAR(100),
    is_school_holiday BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ext_calendar_days_type ON ext_calendar_days(day_type);

-- External events
CREATE TABLE ext_events (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    event_name VARCHAR(200),
    event_type VARCHAR(50),
    affected_routes VARCHAR(10)[],
    source VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Features hourly (joined data for ML)
CREATE TABLE features_hourly (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(10) NOT NULL,
    ts_hour TIMESTAMPTZ NOT NULL,
    passengers INT,
    day_of_week INT,
    month INT,
    year INT,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN,
    temperature DECIMAL(5, 2),
    precipitation DECIMAL(5, 2),
    congestion_level DECIMAL(3, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(route_id, ts_hour)
);

-- Forecast runs
CREATE TABLE forecast_runs (
    run_id SERIAL PRIMARY KEY,
    model_version VARCHAR(100) NOT NULL,
    horizon VARCHAR(20) NOT NULL, -- 'day', 'month', 'year'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rows_count INT DEFAULT 0
);

-- Forecasts
CREATE TABLE forecasts (
    id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES forecast_runs(run_id),
    horizon VARCHAR(20) NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    route_id VARCHAR(10) NOT NULL,
    stop_id VARCHAR(20),
    value DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model metrics
CREATE TABLE model_metrics (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(100) NOT NULL,
    horizon VARCHAR(20) NOT NULL,
    route_id VARCHAR(10),
    slice VARCHAR(50), -- 'route', 'hour', 'day_type'
    wape DECIMAL(5, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hot queries
CREATE INDEX idx_validations_route_date ON validations(route_id, tran_date_time);
CREATE INDEX idx_validations_date ON validations(tran_date_time);
CREATE INDEX idx_target_hourly_route ON target_hourly(route_id, ts_hour);
CREATE INDEX idx_target_hourly_ts ON target_hourly(ts_hour);
CREATE INDEX idx_forecasts_horizon_route_ts ON forecasts(horizon, route_id, ts);
CREATE INDEX idx_forecasts_horizon_stop_ts ON forecasts(horizon, stop_id, ts);
CREATE INDEX idx_features_hourly_route_ts ON features_hourly(route_id, ts_hour);

-- Materialized views for fast aggregation
CREATE MATERIALIZED VIEW mv_forecast_route_hour AS
SELECT
    horizon,
    route_id,
    ts,
    SUM(value) as total_value
FROM forecasts
GROUP BY horizon, route_id, ts;

CREATE MATERIALIZED VIEW mv_forecast_stop_hour AS
SELECT
    horizon,
    stop_id,
    ts,
    SUM(value) as total_value
FROM forecasts
GROUP BY horizon, stop_id, ts;

CREATE MATERIALIZED VIEW mv_forecast_route_day AS
SELECT
    horizon,
    route_id,
    DATE(ts) as date,
    SUM(value) as total_value
FROM forecasts
WHERE horizon IN ('month', 'year')
GROUP BY horizon, route_id, DATE(ts);

CREATE MATERIALIZED VIEW mv_forecast_map_hour AS
SELECT
    horizon,
    stop_id,
    ts,
    value
FROM forecasts
WHERE horizon = 'day';

-- Unique indexes for concurrent refresh
CREATE UNIQUE INDEX idx_mv_forecast_route_hour ON mv_forecast_route_hour(horizon, route_id, ts);
CREATE UNIQUE INDEX idx_mv_forecast_stop_hour ON mv_forecast_stop_hour(horizon, stop_id, ts);
CREATE UNIQUE INDEX idx_mv_forecast_route_day ON mv_forecast_route_day(horizon, route_id, date);
CREATE UNIQUE INDEX idx_mv_forecast_map_hour ON mv_forecast_map_hour(horizon, stop_id, ts);

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backend_ro;
GRANT INSERT, UPDATE, SELECT ON ALL TABLES IN SCHEMA public TO etl_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ml_rw;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO etl_rw, ml_rw;

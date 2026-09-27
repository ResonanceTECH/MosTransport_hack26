# Moscow Transport Hack - Backend & ETL

Backend API and ETL pipeline for passenger flow forecasting on Moscow tram routes.

## Architecture

```
Frontend (React) → Backend (FastAPI) → ETL (FastAPI) → ML (FastAPI)
                         ↓                  ↓
                    PostgreSQL         External APIs
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | React app with MapLibre |
| Keycloak | 8080 | Authentication (SSO) |
| Backend | 8001 | Public API for frontend |
| ETL | 8000 | Data ingestion and forecast orchestration |
| ML | 8000 | ML model predictions |
| PostgreSQL | 5432 | Main database |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Dashboards |

## Quick Start

```bash
# Copy environment variables
cp .env.example .env

# Fill in real API keys in .env

# Start all services
docker compose up -d

# Run ETL ingestion
docker compose run --rm etl python -m app.pipeline.ingest

# View logs
docker compose logs -f backend etl
```

## API Endpoints

### Public API (Backend)

- `GET /api/v1/routes` - List all tram routes
- `GET /api/v1/routes/{route_id}/stops` - Get route stops
- `GET /api/v1/routes/{route_id}/geometry` - Get route geometry (GeoJSON)
- `GET /api/v1/forecast` - Get passenger flow forecast
- `GET /api/v1/forecast/map` - Get forecast data for map
- `GET /api/v1/forecast/export` - Export forecast (CSV/XLSX)
- `GET /api/v1/factors` - Get external factors and presets
- `GET /api/v1/model/info` - Get model information
- `POST /api/v1/telemetry` - Receive frontend telemetry
- `POST /api/v1/admin/recompute` - Trigger forecast recomputation (admin only)

### Internal API (ETL)

- `POST /etl/v1/ingest` - Ingest dataset
- `GET /etl/v1/forecast` - Read precomputed forecasts
- `GET /etl/v1/forecast/map` - Get map data
- `GET /etl/v1/reference/routes` - Get routes reference
- `GET /etl/v1/reference/routes/{route_id}/stops` - Get route stops
- `GET /etl/v1/reference/routes/{route_id}/geometry` - Get route geometry
- `POST /etl/v1/external/refresh` - Refresh external data
- `POST /etl/v1/forecast/precompute` - Trigger forecast precomputation

## Dataset

The dataset is not included in the repository. Place `dataset.zip` in the project root.

Download from: https://disk.yandex.ru/d/DiFwlfMOauxjBg

## External Data Sources

| Source | Description | URL | Status |
|--------|-------------|-----|--------|
| Production calendar | Russian holidays, weekends | https://github.com/isdayoff/calendars | Integrated |
| Open-Meteo Historical | Historical weather (free, no key) | https://archive-api.open-meteo.com | Integrated |
| Yandex Weather | Weather forecast | https://yandex.ru/dev/weather/doc/ru/ | Integrated |
| 2GIS | Traffic data | https://docs.2gis.com/ | Stub (no history) |
| data.mos.ru | Moscow open data | https://data.mos.ru/developers | Stub (optional) |

## Data Loading

### Weather
- **Historical data**: Open-Meteo API (free, no API key needed)
  - Temperature, precipitation, snow, wind speed
  - Hourly granularity
  - Used for model training
- **Forecast**: Yandex Weather API
  - 7-day forecast
  - Used for predictions

### Calendar
- Production calendar for Russia
- Holidays, weekends, school holidays
- Generated for 2026-2027

### Traffic
- 2GIS API (limited - no historical data)
- Only current traffic situation
- For training: use as external feature if available

## Data Loading

### Weather
- **Historical data**: Open-Meteo API (free, no API key needed)
  - Temperature, precipitation, snow, wind speed
  - Hourly granularity
  - Used for model training
- **Forecast**: Open-Meteo + Yandex Weather API
  - 7-day forecast
  - Used for predictions

### Calendar
- Production calendar for Russia
- Holidays, weekends, school holidays
- Generated for 2026-2027

### Traffic
- 2GIS API (limited - no historical data)
- Only current traffic situation
- For training: use as external feature if available

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### ETL

```bash
cd etl
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
.
├── backend/           # Backend API (FastAPI)
│   ├── app/
│   │   ├── api/       # API routers
│   │   ├── core/      # Middleware, exceptions
│   │   └── services/  # External service clients
│   ├── Dockerfile
│   └── requirements.txt
├── etl/               # ETL service (FastAPI)
│   ├── app/
│   │   ├── api/       # API routers
│   │   ├── core/      # DB, logging
│   │   ├── sources/   # External API integrations
│   │   └── pipeline/  # Ingestion pipeline
│   ├── Dockerfile
│   ├── requirements.txt
│   └── sources.yaml   # External sources config
├── ml/                # ML service (Arthur)
├── frontend/          # Frontend (Dasha)
├── auth/              # Keycloak realm (Dasha)
├── infra/             # Infrastructure (Vova)
│   ├── db/            # SQL migrations
│   ├── prometheus/    # Prometheus config
│   ├── grafana/       # Grafana provisioning
│   └── loadtest/      # k6 load tests
├── common/            # Shared logging/metrics
├── docs/              # Documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT

"""ETL service configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """ETL service settings."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql://etl:etl@db:5432/transport"

    # External APIs
    YANDEX_WEATHER_API_KEY: str = ""
    YANDEX_MAPS_API_KEY: str = ""
    MOSRU_API_KEY: str = ""

    # Dataset
    DATASET_PATH: str = "/app/data/dataset.zip"

    # ML service
    ML_SERVICE_URL: str = "http://ml:8000"

    # External data refresh interval (seconds)
    EXTERNAL_REFRESH_INTERVAL: int = 3600


settings = Settings()

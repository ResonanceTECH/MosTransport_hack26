"""ETL service configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ETL_", env_file=".env", env_file_encoding="utf-8", extra="ignore")

    HOST: str = "0.0.0.0"
    PORT: int = 1010
    LOG_LEVEL: str = "INFO"

    SERVICE_DATABASE_URL: str = "postgresql://etl:etl@service-db:1030/transport"
    LOGS_DATABASE_URL: str = ""

    DATASET_PATH: str = "/app/data/dataset_hourly.parquet"
    # Load the dataset into an empty database on startup.
    AUTO_INGEST: bool = True

    DB_POOL_MIN: int = 1
    DB_POOL_MAX: int = 8
    MAX_FEATURE_ROWS: int = 400_000


settings = Settings()

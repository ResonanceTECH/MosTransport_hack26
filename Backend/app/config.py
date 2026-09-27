"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend service settings."""

    model_config = SettingsConfigDict(env_prefix="BACKEND_", env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    LOG_LEVEL: str = "INFO"

    # External services
    ETL_SERVICE_URL: str = "http://etl:8000"
    ML_SERVICE_URL: str = "http://ml:8000"
    KEYCLOAK_URL: str = "http://keycloak:8080"
    KEYCLOAK_REALM: str = "transport"

    # JWT
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_AUDIENCE: str = "backend"

    # Cache
    CACHE_TTL_SECONDS: int = 600  # 10 minutes for reference data

    # Export
    MAX_EXPORT_ROWS: int = 500_000

    # Coefficients
    K_MIN: float = 0.5
    K_MAX: float = 1.5
    K_DEFAULT: float = 1.0


settings = Settings()

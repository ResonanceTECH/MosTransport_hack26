"""Backend configuration via environment variables (BACKEND_ prefix)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BACKEND_", env_file=".env", env_file_encoding="utf-8", extra="ignore")

    HOST: str = "0.0.0.0"
    PORT: int = 1000
    WORKERS: int = 1
    LOG_LEVEL: str = "INFO"

    ETL_SERVICE_URL: str = "http://etl:1010"
    ML_SERVICE_URL: str = "http://ml:1020"
    SERVICE_DATABASE_URL: str = ""

    # Empty means same-origin access through the frontend reverse proxy.
    CORS_ALLOWED_ORIGINS: str = ""

    # Demo auth: the frontend issues "demo.<user>.<ts>" tokens. Keycloak/JWKS
    # validation is not implemented, so tokens are identity hints only.
    REQUIRE_AUTH: bool = False

    ETL_TIMEOUT_SECONDS: float = 30.0
    ML_TIMEOUT_SECONDS: float = 120.0

    MAX_EXPORT_ROWS: int = 500_000
    HISTORY_DAYS: int = 56
    DEFAULT_MODEL: str = "ensemble"

    K_MIN: float = 0.5
    K_MAX: float = 1.5
    K_DEFAULT: float = 1.0

    # Stop-level values are the route forecast split by stop weight.
    STOP_CAPACITY: float = 320.0


settings = Settings()

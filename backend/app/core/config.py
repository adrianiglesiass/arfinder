import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")

DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://0.0.0.0:4200",
]


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # InsForge
    INSFORGE_URL: str
    INSFORGE_API_KEY: str
    OSS_HOST: str

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # Nominatim
    NOMINATIM_USER_AGENT: str = "Arfinder/1.0"

    # JWT Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    # Application
    APP_NAME: str = "Arfinder"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    DEV_BYPASS_TOKEN: str | None = None

    CORS_ORIGINS: list[str] = DEFAULT_DEV_CORS_ORIGINS

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()

if settings.ENVIRONMENT == "production" and "*" in settings.CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS cannot contain '*' in production")

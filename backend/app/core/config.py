import os

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")


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

    model_config = SettingsConfigDict(
        env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()

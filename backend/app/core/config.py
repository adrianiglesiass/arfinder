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

    # Nominatim
    NOMINATIM_USER_AGENT: str

    # JWT Authentication
    SECRET_KEY: str = (
        "token_de_seguridad_muy_largo_para_evitar_warnings_de_pytest_xdist"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Application
    APP_NAME: str = "Arfinder"

    model_config = SettingsConfigDict(
        env_file=ENV_PATH, env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/arfinder_db"

    # InsForge
    INSFORGE_URL: str = "https://placeholder.insforge.app"
    INSFORGE_API_KEY: str = "placeholder_key"
    OSS_HOST: str = "https://placeholder.insforge.app"

    # Nominatim
    NOMINATIM_USER_AGENT: str = "Arfinder/1.0"

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

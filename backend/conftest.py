import os


import pytest
from dotenv import load_dotenv
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: E402
from app.core.config import settings
from app.core.dependencies import (
    bearer_scheme,
    get_current_user,
    get_current_user_optional,
)
from app.core.exceptions.auth import InvalidCredentialsError
from app.db.database import Base, get_db
from app.main import app
from app.models.user import User
from app.repositories import user_repository

settings.ENVIRONMENT = "testing"

load_dotenv(".env.test", override=False)

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-32chars")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://root:root1234@localhost:5433/arfinder_test_db",
)
os.environ.setdefault("INSFORGE_URL", "https://placeholder.insforge.app")
os.environ.setdefault("INSFORGE_API_KEY", "placeholder_key")
os.environ.setdefault("OSS_HOST", "https://placeholder.insforge.app")
os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "test")
os.environ.setdefault("CLOUDINARY_API_KEY", "test")
os.environ.setdefault("CLOUDINARY_API_SECRET", "test")
os.environ.setdefault("NOMINATIM_USER_AGENT", "Arfinder/1.0")

engine = create_engine(settings.DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once per session and drop them at the end."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function", autouse=True)
def clean_tables():
    """Truncate all tables after each test to ensure isolation."""
    yield
    db = TestingSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@pytest.fixture(scope="function")
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(db, create_test_user):
    # Create default user
    default_user = create_test_user(
        email="test@test.com", insforge_id="default_test_user"
    )

    async def mock_get_current_user(
        credentials=Depends(bearer_scheme), db_session=Depends(override_get_db)
    ):
        if not credentials:
            raise InvalidCredentialsError()

        token = credentials.credentials
        if token.startswith("token_"):
            email = token.replace("token_", "")
            user = user_repository.get_user_by_email(db_session, email)
            if user:
                return user

        return default_user

    async def mock_get_current_user_optional(
        credentials=Depends(bearer_scheme), db_session=Depends(override_get_db)
    ):
        if not credentials:
            return None

        token = credentials.credentials
        if token.startswith("token_"):
            email = token.replace("token_", "")
            user = user_repository.get_user_by_email(db_session, email)
            if user:
                return user

        return default_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_user_optional] = mock_get_current_user_optional

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def create_test_user(db):
    def _create(email: str, insforge_id: str = None):
        user = User(email=email, insforge_id=insforge_id or f"test_{email}")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _create


@pytest.fixture(scope="function")
def auth_token():
    # Default token for test@test.com
    return "token_test@test.com"


@pytest.fixture(scope="function")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

import pytest
from app.services.auth_service import register_user, login_user
from app.schemas.user import UserCreate


def test_register_creates_user(db):
    user = register_user(db, UserCreate(email="test@test.com", password="password123"))
    assert user.id is not None
    assert user.email == "test@test.com"
    assert user.password_hash != "password123"


def test_register_duplicate_email_raises_exception(db):
    register_user(db, UserCreate(email="test@test.com", password="password123"))
    with pytest.raises(ValueError) as exc:
        register_user(db, UserCreate(email="test@test.com", password="otrapassword"))

    assert "already registered" in str(exc.value)


def test_login_returns_token(db):
    register_user(db, UserCreate(email="test@test.com", password="password123"))
    token = login_user(db, email="test@test.com", password="password123")

    assert isinstance(token, str)
    assert len(token) > 0


def test_login_wrong_password_raises_exception(db):
    register_user(db, UserCreate(email="test@test.com", password="password123"))
    with pytest.raises(ValueError) as exc:
        login_user(db, email="test@test.com", password="wrongpassword")

    assert "invalid credentials" in str(exc.value)


def test_login_nonexistent_user_raises_exception(db):
    with pytest.raises(ValueError) as exc:
        login_user(db, email="nonexistent@test.com", password="password123")

    assert "invalid credentials" in str(exc.value)

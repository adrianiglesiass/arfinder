import pytest
from fastapi import HTTPException
from app.services.auth_service import AuthService
from datetime import datetime, timedelta, timezone
import jwt


def test_register_creates_user(db):
    user = AuthService.register(
        db, email="test@test.com", password="password123")

    assert user.id is not None
    assert user.email == "test@test.com"
    assert user.password_hash != "password123"


def test_register_duplicate_email_raises_exception(db):
    AuthService.register(db, email="test@test.com", password="password123")
    with pytest.raises(HTTPException) as exc:
        AuthService.register(db, email="test@test.com",
                             password="anotherpassword")

    assert exc.value.status_code == 400


def test_login_returns_token(db):
    AuthService.register(db, email="test@test.com", password="password123")
    token = AuthService.login(
        db, email="test@test.com", password="password123")

    assert 'access_token' in token
    assert token['token_type'] == 'bearer'


def test_login_wrong_password_raises_exception(db):
    AuthService.register(db, email="test@test.com", password="password123")
    with pytest.raises(HTTPException) as exc:
        AuthService.login(db, email="test@test.com", password="wrongpassword")

    assert exc.value.status_code == 401


def test_login_nonexistent_user_raises_exception(db):
    with pytest.raises(HTTPException) as exc:
        AuthService.login(db, email="nonexistent@test.com",
                          password="password123")

    assert exc.value.status_code == 401


def test_expired_token_raises_exception(db):
    expired_time = datetime.now(timezone.utc) - timedelta(minutes=1)
    payload = {"sub": "1", "exp": expired_time}
    expired_token = jwt.encode(
        payload, AuthService.SECRET_KEY, algorithm=AuthService.ALGORITHM)

    with pytest.raises(HTTPException) as exc:
        AuthService.validate_token(expired_token, db)

    assert exc.value.status_code == 401
    assert exc.value.detail == "token expired"


def test_valid_token_returns_user(db):

    valid_time = datetime.now(timezone.utc) + timedelta(minutes=15)
    payload = {"sub": "1", "exp": valid_time}
    valid_token = jwt.encode(
        payload, AuthService.SECRET_KEY, algorithm=AuthService.ALGORITHM)

    user = AuthService.validate_token(valid_token, db)

    assert user is not None
    assert user.id == 1

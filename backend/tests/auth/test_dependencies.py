import asyncio
from types import SimpleNamespace

import pytest
from fastapi.security import HTTPAuthorizationCredentials

from app.core import dependencies
from app.core.exceptions.auth import InvalidCredentialsError

CREDENTIALS = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")


@pytest.fixture
def threadpool_calls(monkeypatch):
    calls = []
    real = dependencies.run_in_threadpool

    async def spy(fn, *args, **kwargs):
        calls.append(fn.__name__)
        return await real(fn, *args, **kwargs)

    monkeypatch.setattr(dependencies, "run_in_threadpool", spy)
    return calls


def _validate_as(monkeypatch, insforge_user):
    async def fake_validate(_token):
        return SimpleNamespace(user=insforge_user) if insforge_user else None

    monkeypatch.setattr(dependencies, "validate_insforge_token", fake_validate)


def test_get_current_user_resolves_local_user_off_the_event_loop(
    db, create_test_user, monkeypatch, threadpool_calls
):
    user = create_test_user(email="dep@test.com", insforge_id="if_dep")
    _validate_as(monkeypatch, SimpleNamespace(id="if_dep", email="dep@test.com"))

    result = asyncio.run(dependencies.get_current_user(CREDENTIALS, db))

    assert result.id == user.id
    assert threadpool_calls == ["get_or_create_local_user"]


def test_get_current_user_rejects_invalid_token(db, monkeypatch, threadpool_calls):
    _validate_as(monkeypatch, None)

    with pytest.raises(InvalidCredentialsError):
        asyncio.run(dependencies.get_current_user(CREDENTIALS, db))
    assert threadpool_calls == []


def test_get_current_user_optional_uses_the_threadpool(
    db, create_test_user, monkeypatch, threadpool_calls
):
    user = create_test_user(email="opt@test.com", insforge_id="if_opt")
    _validate_as(monkeypatch, SimpleNamespace(id="if_opt", email="opt@test.com"))

    result = asyncio.run(dependencies.get_current_user_optional(CREDENTIALS, db))

    assert result.id == user.id
    assert threadpool_calls == ["get_or_create_local_user"]

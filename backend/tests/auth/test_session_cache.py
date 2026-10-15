import asyncio
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core import security
from app.services import auth_service


def _session(user_id: str):
    return SimpleNamespace(user=SimpleNamespace(id=user_id))


@pytest.fixture
def cache(monkeypatch):
    expiry = time.monotonic() + 120
    entries = {
        "token-a1": (expiry, _session("user-a")),
        "token-a2": (expiry, _session("user-a")),
        "token-b1": (expiry, _session("user-b")),
    }
    monkeypatch.setattr(security, "_token_cache", entries)
    return entries


def test_forget_user_sessions_removes_every_session_of_that_user(cache):
    asyncio.run(security.forget_user_sessions("user-a"))

    assert set(cache) == {"token-b1"}


def test_forget_user_sessions_ignores_unknown_users(cache):
    asyncio.run(security.forget_user_sessions("user-z"))

    assert set(cache) == {"token-a1", "token-a2", "token-b1"}


def test_delete_user_purges_cached_sessions(db, create_test_user, cache, monkeypatch):
    user = create_test_user(email="gone@test.com", insforge_id="user-a")
    monkeypatch.setattr(
        auth_service.insforge.auth, "delete_users", AsyncMock(return_value=None)
    )

    asyncio.run(auth_service.delete_user(db, user))

    assert set(cache) == {"token-b1"}

import asyncio
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core import security


@pytest.fixture
def insforge_mock(monkeypatch):
    monkeypatch.setattr(security, "_token_cache", {})
    monkeypatch.setattr(security, "_negative_cache", {})
    monkeypatch.setattr(security, "_inflight", {})
    get_session = AsyncMock(return_value=None)
    monkeypatch.setattr(security.insforge.auth, "get_current_session", get_session)
    return get_session


def test_repeated_invalid_token_triggers_a_single_insforge_call(insforge_mock):
    async def scenario():
        return [await security.validate_insforge_token("bad-token") for _ in range(100)]

    results = asyncio.run(scenario())

    assert all(session is None for session in results)
    assert insforge_mock.await_count == 1


def test_distinct_tokens_do_not_share_the_negative_mark(insforge_mock):
    async def scenario():
        await security.validate_insforge_token("bad-a")
        await security.validate_insforge_token("bad-b")

    asyncio.run(scenario())

    assert insforge_mock.await_count == 2


def test_negative_mark_expires_after_the_ttl(insforge_mock, monkeypatch):
    clock = SimpleNamespace(now=1000.0)
    monkeypatch.setattr(security, "time", SimpleNamespace(monotonic=lambda: clock.now))

    asyncio.run(security.validate_insforge_token("bad-token"))
    clock.now += security._NEGATIVE_CACHE_TTL_SECONDS + 1
    asyncio.run(security.validate_insforge_token("bad-token"))

    assert insforge_mock.await_count == 2


def test_valid_token_uses_the_positive_cache_and_clears_any_mark(insforge_mock):
    session = SimpleNamespace(user=SimpleNamespace(id="user-1"))
    insforge_mock.return_value = session

    async def scenario():
        first = await security.validate_insforge_token("good-token")
        second = await security.validate_insforge_token("good-token")
        return first, second

    first, second = asyncio.run(scenario())

    assert first is session
    assert second is session
    assert insforge_mock.await_count == 1
    assert security._negative_cache == {}


def test_negative_cache_is_capped(insforge_mock, monkeypatch):
    far_future = time.monotonic() + 3600
    full = {f"old-{i}": far_future for i in range(security._NEGATIVE_CACHE_MAX_ENTRIES)}
    monkeypatch.setattr(security, "_negative_cache", full)

    asyncio.run(security.validate_insforge_token("bad-token"))

    assert len(security._negative_cache) == security._NEGATIVE_CACHE_MAX_ENTRIES

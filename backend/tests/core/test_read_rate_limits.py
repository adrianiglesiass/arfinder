import pytest

from app.core.config import settings
from app.core.rate_limit import SlidingWindowLimiter


@pytest.fixture
def strict_reads(monkeypatch):
    from app.core import rate_limit

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(rate_limit, "read_limiter", SlidingWindowLimiter(2))


READ_ROUTES = [
    ("GET", "/auth/me"),
    ("GET", "/profiles/me"),
    ("GET", "/conversations"),
    ("GET", "/conversations/999999"),
    ("GET", "/conversations/999999/messages"),
    ("PATCH", "/conversations/999999/read"),
    ("PATCH", "/messages/999999/read"),
]


@pytest.mark.parametrize("method,path", READ_ROUTES)
def test_read_routes_are_rate_limited_per_user(
    client, auth_headers, strict_reads, method, path
):
    responses = [client.request(method, path, headers=auth_headers) for _ in range(3)]

    assert all(res.status_code != 429 for res in responses[:2])
    assert responses[2].status_code == 429
    assert responses[2].headers.get("Retry-After") == "60"


def test_read_limit_is_per_user(client, auth_headers, create_test_user, strict_reads):
    create_test_user(email="other@test.com")
    other_headers = {"Authorization": "Bearer token_other@test.com"}
    for _ in range(3):
        client.get("/auth/me", headers=auth_headers)

    res = client.get("/auth/me", headers=other_headers)

    assert res.status_code == 200


def test_health_is_never_rate_limited(client, auth_headers, strict_reads):
    for _ in range(3):
        client.get("/auth/me", headers=auth_headers)
    assert client.get("/auth/me", headers=auth_headers).status_code == 429

    assert client.get("/health").status_code == 200
    assert client.get("/health/realtime").status_code == 200


def test_public_profile_uses_the_ip_limiter(client, monkeypatch):
    from app.core import rate_limit

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(rate_limit, "limiter", SlidingWindowLimiter(2))

    statuses = [client.get("/profiles/999999").status_code for _ in range(3)]

    assert 429 not in statuses[:2]
    assert statuses[2] == 429


def test_sync_cleanup_uses_the_ip_limiter(client, monkeypatch):
    from app.core import rate_limit

    # "staging": ni producción (la ruta responde 404) ni testing (salta el guard)
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    monkeypatch.setattr(rate_limit, "limiter", SlidingWindowLimiter(2))

    statuses = [client.post("/auth/sync-cleanup").status_code for _ in range(3)]

    assert 429 not in statuses[:2]
    assert statuses[2] == 429

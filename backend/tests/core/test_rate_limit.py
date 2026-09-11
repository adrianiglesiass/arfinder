import pytest
from types import SimpleNamespace

from app.core.rate_limit import SlidingWindowLimiter, client_key


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def _request(headers: dict[str, str] | None = None, host: str | None = "10.0.0.1"):
    return SimpleNamespace(
        headers=headers or {},
        client=SimpleNamespace(host=host) if host else None,
    )


def test_limit_is_per_key():
    limiter = SlidingWindowLimiter(3, clock=FakeClock())

    assert [limiter.try_acquire("a") for _ in range(3)] == [True, True, True]
    assert limiter.try_acquire("a") is False
    assert limiter.try_acquire("b") is True


def test_window_expires():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(2, window_seconds=60, clock=clock)
    limiter.try_acquire("a")
    limiter.try_acquire("a")
    assert limiter.try_acquire("a") is False

    clock.now += 61

    assert limiter.try_acquire("a") is True


def test_window_slides_instead_of_resetting():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(2, window_seconds=60, clock=clock)
    limiter.try_acquire("a")
    clock.now += 30
    limiter.try_acquire("a")
    clock.now += 31

    assert limiter.try_acquire("a") is True
    assert limiter.try_acquire("a") is False


def test_tracked_keys_have_a_hard_cap():
    limiter = SlidingWindowLimiter(5, max_keys=2, clock=FakeClock())
    limiter.try_acquire("a")
    limiter.try_acquire("b")
    limiter.try_acquire("c")

    assert limiter.tracked_keys() == 2


def test_least_recently_used_key_is_evicted_first():
    limiter = SlidingWindowLimiter(1, max_keys=2, clock=FakeClock())
    limiter.try_acquire("a")
    limiter.try_acquire("b")
    limiter.try_acquire("a")
    limiter.try_acquire("c")

    assert limiter.try_acquire("a") is False
    assert limiter.try_acquire("b") is True


def test_client_key_prefers_fly_client_ip_on_fly(monkeypatch):
    monkeypatch.setenv("FLY_APP_NAME", "arfinder-api")
    request = _request(
        headers={"fly-client-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4"}
    )
    assert client_key(request) == "ip:203.0.113.7"


def test_client_key_ignores_fly_header_outside_fly(monkeypatch):
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    request = _request(headers={"fly-client-ip": "203.0.113.7"})
    assert client_key(request) == "ip:10.0.0.1"


def test_client_key_groups_ipv6_by_64_prefix(monkeypatch):
    monkeypatch.setenv("FLY_APP_NAME", "arfinder-api")
    first = _request(headers={"fly-client-ip": "2001:db8:1:2::1"})
    second = _request(headers={"fly-client-ip": "2001:db8:1:2:ffff::9"})

    assert client_key(first) == client_key(second) == "ip:2001:db8:1:2::/64"


def test_client_key_falls_back_to_socket_host():
    assert client_key(_request()) == "ip:10.0.0.1"
    assert client_key(_request(host=None)) == "ip:unknown"


ACTION_ROUTES = [
    ("POST", "/conversations", {"other_user_id": 999999}),
    ("POST", "/profiles/999999/block", None),
    ("DELETE", "/profiles/999999/block", None),
    ("POST", "/profiles/999999/report", {"reason": "spam"}),
    ("POST", "/profiles/999999/favorite", None),
    ("DELETE", "/profiles/999999/favorite", None),
]


@pytest.fixture
def strict_actions(monkeypatch):
    from app.core import rate_limit
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(rate_limit, "action_limiter", SlidingWindowLimiter(2))
    monkeypatch.setattr(rate_limit, "safety_limiter", SlidingWindowLimiter(2))


@pytest.mark.parametrize("method,path,body", ACTION_ROUTES)
def test_action_routes_are_rate_limited(
    client, auth_headers, strict_actions, method, path, body
):
    statuses = [
        client.request(method, path, headers=auth_headers, json=body).status_code
        for _ in range(3)
    ]

    assert 429 not in statuses[:2]
    assert statuses[2] == 429


def test_action_limit_is_per_user(
    client, auth_headers, create_test_user, strict_actions
):
    create_test_user(email="other@test.com")
    other_headers = {"Authorization": "Bearer token_other@test.com"}
    for _ in range(3):
        client.post("/profiles/999999/block", headers=auth_headers)

    res = client.post("/profiles/999999/block", headers=other_headers)

    assert res.status_code == 404


def test_favorite_spam_does_not_block_safety_actions(
    client, auth_headers, strict_actions
):
    for _ in range(3):
        client.post("/profiles/999999/favorite", headers=auth_headers)

    res = client.post("/profiles/999999/block", headers=auth_headers)

    assert res.status_code == 404

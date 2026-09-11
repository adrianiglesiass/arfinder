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

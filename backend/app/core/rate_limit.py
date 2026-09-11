import ipaddress
import os
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User

WINDOW_SECONDS = 60.0
REQUESTS_PER_WINDOW = 60
MESSAGES_PER_WINDOW = 120
MAX_TRACKED_KEYS = 10_000
IPV6_PREFIX = 64


class SlidingWindowLimiter:
    def __init__(
        self,
        limit: int,
        window_seconds: float = WINDOW_SECONDS,
        max_keys: int = MAX_TRACKED_KEYS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._limit = limit
        self._window = window_seconds
        self._max_keys = max_keys
        self._clock = clock
        self._hits: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def try_acquire(self, key: str) -> bool:
        now = self._clock()
        cutoff = now - self._window
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                while len(self._hits) >= self._max_keys:
                    self._hits.popitem(last=False)
                hits = deque()
                self._hits[key] = hits
            else:
                self._hits.move_to_end(key)
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self._limit:
                return False
            hits.append(now)
            return True

    def tracked_keys(self) -> int:
        with self._lock:
            return len(self._hits)


limiter = SlidingWindowLimiter(REQUESTS_PER_WINDOW)
message_limiter = SlidingWindowLimiter(MESSAGES_PER_WINDOW)


def _normalize_ip(raw: str) -> str:
    try:
        address = ipaddress.ip_address(raw.strip())
    except ValueError:
        return raw.strip()
    if address.version == 6:
        return str(ipaddress.ip_network(f"{address}/{IPV6_PREFIX}", strict=False))
    return str(address)


def client_key(request: Request) -> str:
    fly_ip = request.headers.get("fly-client-ip") if os.getenv("FLY_APP_NAME") else None
    raw = fly_ip or (request.client.host if request.client else "unknown")
    return f"ip:{_normalize_ip(raw)}"


def _too_many() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Demasiadas peticiones. Por favor, inténtalo de nuevo en un minuto.",
        headers={"Retry-After": "60"},
    )


async def rate_limiter(request: Request):
    if settings.ENVIRONMENT == "testing":
        return

    if not limiter.try_acquire(client_key(request)):
        raise _too_many()


async def message_rate_limiter(current_user: User = Depends(get_current_user)) -> User:
    if settings.ENVIRONMENT == "testing":
        return current_user

    if not message_limiter.try_acquire(f"user:{current_user.id}"):
        raise _too_many()
    return current_user

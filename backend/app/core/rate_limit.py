import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User

WINDOW_SECONDS = 60.0
REQUESTS_PER_WINDOW = 60
MESSAGES_PER_WINDOW = 120
MAX_TRACKED_KEYS = 10_000


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
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def try_acquire(self, key: str) -> bool:
        now = self._clock()
        cutoff = now - self._window
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                if len(self._hits) >= self._max_keys:
                    self._purge_idle(cutoff)
                hits = deque()
                self._hits[key] = hits
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self._limit:
                return False
            hits.append(now)
            return True

    def tracked_keys(self) -> int:
        with self._lock:
            return len(self._hits)

    def _purge_idle(self, cutoff: float) -> None:
        idle = [
            key for key, hits in self._hits.items() if not hits or hits[-1] <= cutoff
        ]
        for key in idle:
            del self._hits[key]


limiter = SlidingWindowLimiter(REQUESTS_PER_WINDOW)
message_limiter = SlidingWindowLimiter(MESSAGES_PER_WINDOW)


def client_key(request: Request) -> str:
    fly_ip = request.headers.get("fly-client-ip")
    if fly_ip:
        return f"ip:{fly_ip.strip()}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


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

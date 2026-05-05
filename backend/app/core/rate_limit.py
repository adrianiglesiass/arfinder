from app.core.config import settings
import asyncio
from fastapi import Depends, HTTPException, Request, status
from pyrate_limiter import Duration, Limiter, Rate

from app.core.dependencies import get_current_user
from app.models.user import User

auth_rate = Rate(60, Duration.MINUTE)
limiter = Limiter(auth_rate)

message_rate = Rate(120, Duration.MINUTE)
message_limiter = Limiter(message_rate)


async def _try_acquire(lim: Limiter, key: str) -> bool:
    acquired = lim.try_acquire(key, blocking=False)
    if asyncio.iscoroutine(acquired) or asyncio.isfuture(acquired):
        acquired = await acquired
    return bool(acquired)


def _too_many() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Demasiadas peticiones. Por favor, inténtalo de nuevo en un minuto.",
        headers={"Retry-After": "60"},
    )


async def rate_limiter(request: Request):
    if settings.ENVIRONMENT == "testing":
        return

    client_ip = request.client.host if request.client else "unknown"
    if not await _try_acquire(limiter, client_ip):
        raise _too_many()


async def message_rate_limiter(current_user: User = Depends(get_current_user)) -> User:
    if settings.ENVIRONMENT == "testing":
        return current_user

    if not await _try_acquire(message_limiter, f"user:{current_user.id}"):
        raise _too_many()
    return current_user

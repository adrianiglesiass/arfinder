from app.core.config import settings
import asyncio
from fastapi import HTTPException, Request, status
from pyrate_limiter import Duration, Limiter, Rate

auth_rate = Rate(10, Duration.MINUTE)
limiter = Limiter(auth_rate)


async def rate_limiter(request: Request):
    if settings.ENVIRONMENT == "testing":
        return

    client_ip = request.client.host if request.client else "unknown"

    acquired = limiter.try_acquire(client_ip, blocking=False)

    if asyncio.iscoroutine(acquired) or asyncio.isfuture(acquired):
        acquired = await acquired

    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas peticiones. Por favor, inténtalo de nuevo en un minuto.",
            headers={"Retry-After": "60"},
        )

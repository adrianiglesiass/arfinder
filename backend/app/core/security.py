import asyncio
import hashlib
import time

from insforge import InsforgeClient

from app.core.config import settings


insforge = InsforgeClient(settings.INSFORGE_URL, settings.INSFORGE_API_KEY)


_TOKEN_CACHE_TTL_SECONDS = 120

_token_cache: dict[str, tuple[float, object]] = {}
_inflight: dict[str, asyncio.Future] = {}
_cache_lock = asyncio.Lock()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _purge_expired_locked(now: float) -> None:
    expired = [k for k, (exp, _) in _token_cache.items() if exp <= now]
    for k in expired:
        _token_cache.pop(k, None)


async def validate_insforge_token(token: str):
    if not token:
        return None

    key = _hash_token(token)
    now = time.monotonic()

    async with _cache_lock:
        cached = _token_cache.get(key)
        if cached:
            expiry, session = cached
            if expiry > now:
                return session
            _token_cache.pop(key, None)

        future = _inflight.get(key)
        is_leader = future is None
        if is_leader:
            future = asyncio.get_running_loop().create_future()
            _inflight[key] = future

    if not is_leader:
        try:
            return await future
        except Exception:
            return None

    try:
        session = await insforge.auth.get_current_session(access_token=token)
    except Exception:
        session = None

    async with _cache_lock:
        _inflight.pop(key, None)
        if session is not None:
            _token_cache[key] = (time.monotonic() + _TOKEN_CACHE_TTL_SECONDS, session)
            _purge_expired_locked(now)

    if not future.done():
        future.set_result(session)
    return session

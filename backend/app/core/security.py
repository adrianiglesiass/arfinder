import asyncio
import hashlib
import time

from insforge import InsforgeClient

from app.core.config import settings


insforge = InsforgeClient(settings.INSFORGE_URL, settings.INSFORGE_API_KEY)


_TOKEN_CACHE_TTL_SECONDS = 120
_NEGATIVE_CACHE_TTL_SECONDS = 60
_NEGATIVE_CACHE_MAX_ENTRIES = 2000

_token_cache: dict[str, tuple[float, object]] = {}
_negative_cache: dict[str, float] = {}
_inflight: dict[str, asyncio.Future] = {}
_cache_lock = asyncio.Lock()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _purge_expired_locked(now: float) -> None:
    expired = [k for k, (exp, _) in _token_cache.items() if exp <= now]
    for k in expired:
        _token_cache.pop(k, None)


def _purge_negative_locked(now: float) -> None:
    expired = [k for k, exp in _negative_cache.items() if exp <= now]
    for k in expired:
        _negative_cache.pop(k, None)
    while len(_negative_cache) > _NEGATIVE_CACHE_MAX_ENTRIES:
        _negative_cache.pop(next(iter(_negative_cache)))


def _session_user_id(session: object) -> str | None:
    user_id = getattr(getattr(session, "user", None), "id", None)
    return str(user_id) if user_id is not None else None


async def forget_user_sessions(insforge_user_id: str) -> None:
    target = str(insforge_user_id)
    async with _cache_lock:
        stale = [
            key
            for key, (_, session) in _token_cache.items()
            if _session_user_id(session) == target
        ]
        for key in stale:
            _token_cache.pop(key, None)


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

        negative_expiry = _negative_cache.get(key)
        if negative_expiry is not None:
            if negative_expiry > now:
                return None
            _negative_cache.pop(key, None)

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
            _negative_cache.pop(key, None)
            _purge_expired_locked(now)
        else:
            # Caché negativa: sin esta marca, cada token inválido repetido (p. ej.
            # un diccionario de bearers aleatorios) detonaría una llamada saliente
            # a InsForge, que es un amplificador de coste de egress bajo abuso.
            # Solo se guarda el hash, nunca el token en claro.
            _negative_cache[key] = time.monotonic() + _NEGATIVE_CACHE_TTL_SECONDS
            _purge_negative_locked(now)

    if not future.done():
        future.set_result(session)
    return session

import asyncio
import json
import logging
import os
import time
import unicodedata

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "cities.json",
)

_RESULT_LIMIT = 10
_PREFIX_KEY_LEN = 2

_FALLBACK_MIN_LEN = 3
_FALLBACK_CACHE_TTL_SECONDS = 24 * 60 * 60
_FALLBACK_TIMEOUT_SECONDS = 3.0

_cities: list[str] = []
_prefix_index: dict[str, list[str]] = {}

_client: httpx.AsyncClient | None = None

_fallback_cache: dict[str, tuple[float, list[str]]] = {}
_fallback_cache_lock = asyncio.Lock()


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return (
        "".join(c for c in normalized if not unicodedata.combining(c)).lower().strip()
    )


def _search_tokens(ascii_name: str) -> list[str]:
    tokens = [ascii_name]
    tokens.extend(word for word in ascii_name.split() if len(word) >= _PREFIX_KEY_LEN)
    return tokens


def load_cities() -> None:
    global _cities, _prefix_index
    with open(_DATA_PATH, encoding="utf-8") as f:
        _cities = json.load(f)

    index: dict[str, list[str]] = {}
    for name in _cities:
        ascii_name = _normalize(name)
        keys = {token[:_PREFIX_KEY_LEN] for token in _search_tokens(ascii_name)}
        for key in keys:
            index.setdefault(key, []).append(name)
    _prefix_index = index


async def start_http_client() -> None:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=_FALLBACK_TIMEOUT_SECONDS,
            headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
        )


async def stop_http_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def search_cities_local(q: str) -> list[str]:
    normalized = _normalize(q)
    if len(normalized) < _PREFIX_KEY_LEN:
        return []

    bucket = _prefix_index.get(normalized[:_PREFIX_KEY_LEN], [])
    seen: set[str] = set()
    results: list[str] = []
    for name in bucket:
        ascii_name = _normalize(name)
        if not any(
            token.startswith(normalized) for token in _search_tokens(ascii_name)
        ):
            continue
        if name in seen:
            continue
        seen.add(name)
        results.append(name)
        if len(results) >= _RESULT_LIMIT:
            break
    return results


async def search_cities_fallback(q: str) -> list[str]:
    normalized = _normalize(q)
    if len(normalized) < _FALLBACK_MIN_LEN or _client is None:
        return []

    now = time.monotonic()
    async with _fallback_cache_lock:
        cached = _fallback_cache.get(normalized)
        if cached and cached[0] > now:
            return cached[1]

    try:
        response = await _client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": q,
                "featuretype": "city",
                "format": "json",
                "limit": _RESULT_LIMIT,
            },
        )
        response.raise_for_status()
    except (httpx.TimeoutException, httpx.HTTPError) as exc:
        logger.warning("Nominatim fallback failed for %r: %s", q, exc)
        return []

    payload = response.json()
    seen: set[str] = set()
    cities: list[str] = []
    for item in payload:
        name = item.get("display_name", "").split(",")[0].strip()
        if name and name not in seen:
            seen.add(name)
            cities.append(name)

    async with _fallback_cache_lock:
        _fallback_cache[normalized] = (now + _FALLBACK_CACHE_TTL_SECONDS, cities)

    return cities

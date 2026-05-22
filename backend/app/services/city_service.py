import httpx

from app.core.config import settings
from app.core.exceptions.city import CitySearchUnavailableError

_client: httpx.AsyncClient | None = None


async def start_http_client() -> None:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=5.0,
            headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
        )


async def stop_http_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _get_client() -> httpx.AsyncClient:
    if _client is None:
        raise CitySearchUnavailableError()
    return _client


async def search_cities(q: str) -> list[str]:
    try:
        response = await _get_client().get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": q,
                "featuretype": "city",
                "format": "json",
                "limit": 10,
            },
        )
        response.raise_for_status()
    except httpx.HTTPError:
        raise CitySearchUnavailableError()

    results = response.json()
    seen = set()
    cities = []
    for item in results:
        name = item.get("display_name", "").split(",")[0].strip()
        if name and name not in seen:
            seen.add(name)
            cities.append(name)

    return cities

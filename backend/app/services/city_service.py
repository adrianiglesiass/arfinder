import httpx

from app.core.config import settings


async def search_cities(q: str) -> list[str]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": q,
                "featuretype": "city",
                "format": "json",
                "limit": 10,
            },
            headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
            timeout=5.0,
        )
        response.raise_for_status()

    results = response.json()
    seen = set()
    cities = []
    for item in results:
        name = item.get("display_name", "").split(",")[0].strip()
        if name and name not in seen:
            seen.add(name)
            cities.append(name)

    return cities

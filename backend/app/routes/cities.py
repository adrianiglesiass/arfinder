import httpx
from fastapi import APIRouter, Query

from app.core.config import settings


router = APIRouter(prefix="/cities", tags=["cities"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = settings.NOMINATIM_USER_AGENT


@router.get("/search")
async def autocomplete(q: str = Query(min_length=2)) -> list[str]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            NOMINATIM_URL,
            params={
                "q": q,
                "featuretype": "city",
                "format": "json",
                "limit": 10,
            },
            headers={"User-Agent": USER_AGENT},
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

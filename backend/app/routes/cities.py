from fastapi import APIRouter, Depends, Query

from app.core.openapi import BAD_REQUEST, SERVICE_UNAVAILABLE
from app.services.city_service import search_cities_fallback, search_cities_local
from app.core.rate_limit import rate_limiter

router = APIRouter(
    prefix="/cities", tags=["cities"], dependencies=[Depends(rate_limiter)]
)


@router.get("/search", responses={**BAD_REQUEST})
async def search(q: str = Query(min_length=2)) -> list[str]:
    return search_cities_local(q)


@router.get("/search/extended", responses={**BAD_REQUEST, **SERVICE_UNAVAILABLE})
async def search_extended(q: str = Query(min_length=3)) -> list[str]:
    local = search_cities_local(q)
    if local:
        return local
    return await search_cities_fallback(q)

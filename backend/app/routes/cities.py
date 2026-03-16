from fastapi import APIRouter, Query

from app.services.city_service import search_cities

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("/search")
async def search(q: str = Query(min_length=2)) -> list[str]:
    return await search_cities(q)

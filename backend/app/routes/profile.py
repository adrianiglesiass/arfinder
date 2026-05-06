from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from app.core.file_validation import validate_image_header
from app.core.rate_limit import rate_limiter
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.openapi import NOT_FOUND, PROTECTED, UNAUTH, BAD_REQUEST
from app.db.database import get_db
from app.core.route_utils import parse_age_param, parse_bool_param
from app.models.profile import ScheduleEnum, TypeEnum
from app.models.user import User
from app.schemas.profile import (
    ProfileCreate,
    ProfilePhotoResponse,
    ProfileResponse,
    ProfileSummary,
    ProfileUpdate,
)
from app.services import profile_photo_service, profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class _PhotoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    order: Optional[int] = None
    is_main: Optional[bool] = None


class _PhotoReorder(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ordered_ids: List[int] = Field(..., max_length=50)


@router.get(
    "",
    response_model=List[ProfileSummary],
    responses=BAD_REQUEST,
    dependencies=[Depends(rate_limiter)],
)
def search(
    city: Optional[str] = Query(None),
    budget_max: Optional[int] = Query(None),
    has_pets: Optional[bool | str] = Query(None),
    is_smoker: Optional[bool | str] = Query(None),
    schedule: Optional[ScheduleEnum] = Query(None),
    profile_type: Optional[TypeEnum] = Query(None),
    gender: Optional[str] = Query(None),
    age_min: Optional[int | str] = Query(None),
    age_max: Optional[int | str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    clean_age_min = parse_age_param(age_min, "age_min")
    clean_age_max = parse_age_param(age_max, "age_max")
    clean_has_pets = parse_bool_param(has_pets, "has_pets")
    clean_is_smoker = parse_bool_param(is_smoker, "is_smoker")

    return profile_service.search_profiles(
        db,
        city,
        budget_max,
        clean_has_pets,
        clean_is_smoker,
        schedule,
        profile_type,
        gender,
        clean_age_min,
        clean_age_max,
        skip,
        limit,
        exclude_user_id=current_user.id if current_user else None,
    )


@router.get("/me", response_model=ProfileResponse, responses=PROTECTED)
async def get_my_profile(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response.headers["Cache-Control"] = "private, max-age=60"
    return profile_service.get_profile(db, current_user.id)


@router.post("/me", response_model=ProfileResponse, responses=UNAUTH)
async def create_my_profile(
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.create_profile(db, current_user.id, data)


@router.patch("/me", response_model=ProfileResponse, responses=PROTECTED)
async def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.update_profile(db, current_user.id, data)


@router.post(
    "/me/photos",
    response_model=ProfilePhotoResponse,
    dependencies=[Depends(rate_limiter)],
    responses={**PROTECTED, 413: {"description": "File too large"}},
)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.size and file.size > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    header = await file.read(2048)
    validate_image_header(header)
    await file.seek(0)

    return await profile_photo_service.upload(db, current_user.id, file.file)


@router.get("/me/photos", response_model=List[ProfilePhotoResponse], responses=UNAUTH)
async def list_profile_photos(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        return profile_photo_service.list_for_user(db, current_user.id)
    except HTTPException as e:
        if e.status_code == 404:
            return []
        raise


@router.patch(
    "/me/photos/reorder", response_model=List[ProfilePhotoResponse], responses=PROTECTED
)
async def reorder_profile_photos(
    data: _PhotoReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.reorder(db, current_user.id, data.ordered_ids)


@router.delete("/me/photos/reorder", include_in_schema=False)
async def catch_reorder_delete():
    raise HTTPException(
        status_code=405, detail="Method Not Allowed", headers={"Allow": "PATCH"}
    )


@router.patch(
    "/me/photos/{photo_id}", response_model=ProfilePhotoResponse, responses=PROTECTED
)
async def update_profile_photo(
    photo_id: int,
    data: _PhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.update(
        db, current_user.id, photo_id, order=data.order, is_main=data.is_main
    )


@router.delete("/me/photos/{photo_id}", responses=PROTECTED)
async def delete_profile_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_photo_service.delete(db, current_user.id, photo_id)
    return {"detail": "deleted"}


@router.get("/{profile_id}", response_model=ProfileResponse, responses=NOT_FOUND)
def get_public_profile(
    profile_id: int, response: Response, db: Session = Depends(get_db)
):
    response.headers["Cache-Control"] = "public, max-age=60"
    return profile_service.get_public_profile(db, profile_id)


@router.delete("/me", status_code=204, responses=PROTECTED)
async def delete_my_profile(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    profile_service.delete_profile(db, current_user.id)

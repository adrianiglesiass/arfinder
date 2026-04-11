from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.openapi import NOT_FOUND, PROTECTED, UNAUTH, BAD_REQUEST
from app.db.database import get_db
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

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


class _PhotoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    order: Optional[int] = None
    is_main: Optional[bool] = None


class _PhotoReorder(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ordered_ids: List[int] = Field(..., max_length=50)


@router.get("", response_model=List[ProfileSummary], responses=BAD_REQUEST)
def search(
    city: Optional[str] = Query(None),
    budget_max: Optional[int] = Query(None),
    has_pets: Optional[bool] = Query(None),
    is_smoker: Optional[bool] = Query(None),
    schedule: Optional[ScheduleEnum] = Query(None),
    profile_type: Optional[TypeEnum] = Query(None),
    gender: Optional[str] = Query(None),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return profile_service.search_profiles(
        db,
        city,
        budget_max,
        has_pets,
        is_smoker,
        schedule,
        profile_type,
        gender,
        age_min,
        age_max,
        skip,
        limit,
    )


@router.get("/me", response_model=ProfileResponse, responses=PROTECTED)
async def get_my_profile(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
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
    responses={**PROTECTED, 413: {"description": "File too large"}},
)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.size and file.size > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 5MB limit")
    return await profile_photo_service.upload(db, current_user.id, file.file)


@router.get("/me/photos", response_model=List[ProfilePhotoResponse], responses=UNAUTH)
async def list_profile_photos(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return profile_photo_service.list_for_user(db, current_user.id)


@router.patch(
    "/me/photos/reorder", response_model=List[ProfilePhotoResponse], responses=PROTECTED
)
async def reorder_profile_photos(
    data: _PhotoReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.reorder(db, current_user.id, data.ordered_ids)


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
def get_public_profile(profile_id: int, db: Session = Depends(get_db)):
    return profile_service.get_public_profile(db, profile_id)


@router.delete("/me", status_code=204, responses=PROTECTED)
async def delete_my_profile(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    profile_service.delete_profile(db, current_user.id)

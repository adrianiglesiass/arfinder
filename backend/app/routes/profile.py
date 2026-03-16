from typing import List

from fastapi import APIRouter, Depends, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.profile import ScheduleEnum, TypeEnum
from app.models.user import User
from app.schemas.profile import (
    ProfileCreate,
    ProfilePhotoResponse,
    ProfileResponse,
    ProfileUpdate,
)
from app.services import profile_photo_service
from app.services.profile_service import (
    create_profile,
    delete_profile,
    get_profile,
    search_profiles,
    update_profile,
    get_public_profile as profile_service_get_public_profile,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


class _PhotoUpdate(BaseModel):
    order: int | None = None
    is_main: bool | None = None


class _PhotoReorder(BaseModel):
    ordered_ids: list[int]


@router.get("", response_model=list[ProfileResponse])
def search(
    city: str | None = Query(default=None),
    budget_max: int | None = Query(default=None),
    has_pets: bool | None = Query(default=None),
    is_smoker: bool | None = Query(default=None),
    schedule: ScheduleEnum | None = Query(default=None),
    profile_type: TypeEnum | None = Query(default=None),
    gender: str | None = Query(default=None),
    age_min: int | None = Query(default=None),
    age_max: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return search_profiles(
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
    )


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile(db, current_user.id)


@router.post("/me", response_model=ProfileResponse)
def create_my_profile(
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_profile(db, current_user.id, data)


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_profile(db, current_user.id, data)


@router.post("/me/photos", response_model=ProfilePhotoResponse)
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.upload(db, current_user.id, file.file)


@router.get("/me/photos", response_model=List[ProfilePhotoResponse])
def list_profile_photos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.list_for_user(db, current_user.id)


@router.patch("/me/photos/reorder", response_model=List[ProfilePhotoResponse])
def reorder_profile_photos(
    data: _PhotoReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.reorder(db, current_user.id, data.ordered_ids)


@router.patch("/me/photos/{photo_id}", response_model=ProfilePhotoResponse)
def update_profile_photo(
    photo_id: int,
    data: _PhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_photo_service.update(
        db, current_user.id, photo_id, order=data.order, is_main=data.is_main
    )


@router.delete("/me/photos/{photo_id}")
def delete_profile_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_photo_service.delete(db, current_user.id, photo_id)
    return {"detail": "deleted"}


@router.get("/{profile_id}", response_model=ProfileResponse)
def get_public_profile(
    profile_id: int,
    db: Session = Depends(get_db),
):
    return profile_service_get_public_profile(db, profile_id)


@router.delete("/me", status_code=204)
def delete_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_profile(db, current_user.id)

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from typing import List
from pydantic import BaseModel
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    ProfilePhotoResponse,
)
from app.services.profile_service import ProfileService
from app.services.profile_photo_service import ProfilePhotoService
from app.models.user import User

router = APIRouter(prefix="/profiles", tags=["profiles"])


class _PhotoUpdate(BaseModel):
    order: int | None = None
    is_main: bool | None = None


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return ProfileService.get_profile(db, current_user.id)


@router.post("/me", response_model=ProfileResponse)
def create_my_profile(
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProfileService.create_profile(db, current_user.id, data)


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProfileService.update_profile(db, current_user.id, data)


@router.post("/me/photos", response_model=ProfilePhotoResponse)
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProfilePhotoService.upload(db, current_user.id, file.file)


@router.get("/me/photos", response_model=List[ProfilePhotoResponse])
def list_profile_photos(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return ProfilePhotoService.list_for_user(db, current_user.id)


@router.patch("/me/photos/{photo_id}", response_model=ProfilePhotoResponse)
def update_profile_photo(
    photo_id: int,
    data: _PhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ProfilePhotoService.update(
        db, current_user.id, photo_id, order=data.order, is_main=data.is_main
    )


@router.delete("/me/photos/{photo_id}")
def delete_profile_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ProfilePhotoService.delete(db, current_user.id, photo_id)
    return {"detail": "deleted"}

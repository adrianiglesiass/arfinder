from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import ProfileCreate, ProfileUpdate, ProfileResponse
from app.services.profile_service import ProfileService
from app.clients.cloudinary_client import upload_image
from app.models import User

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ProfileService.get_profile(db, current_user.id)


@router.post("/me", response_model=ProfileResponse)
def create_my_profile(
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ProfileService.create_profile(db, current_user.id, data)


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ProfileService.update_profile(db, current_user.id, data)


@router.post("/me/photo", response_model=ProfileResponse)
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    foto_url = upload_image(file.file)
    return ProfileService.update_photo(db, current_user.id, foto_url)

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.profile_repository import profile_repository
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileService:
    @staticmethod
    def get_profile(db: Session, user_id: int):
        profile = profile_repository.get_by_user_id(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
            )
        return profile

    @staticmethod
    def create_profile(db: Session, user_id: int, data: ProfileCreate):
        existing = profile_repository.get_by_user_id(db, user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Profile already exists"
            )
        return profile_repository.create(db, user_id, data)

    @staticmethod
    def update_profile(db: Session, user_id: int, data: ProfileUpdate):
        profile = profile_repository.get_by_user_id(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
            )
        return profile_repository.update(db, profile, data)

    @staticmethod
    def update_photo(db: Session, user_id: int, foto_url: str):
        profile = profile_repository.get_by_user_id(db, user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
            )
        return profile_repository.update_photo(db, profile, foto_url)

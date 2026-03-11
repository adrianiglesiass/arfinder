from sqlalchemy.orm import Session
from app.repositories import profile_repository
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.core.exceptions.profile import ProfileNotFoundError, ProfileAlreadyExistsError


class ProfileService:
    @staticmethod
    def get_profile(db: Session, user_id: int):
        profile = profile_repository.get_profile_by_user_id(db, user_id)
        if not profile:
            raise ProfileNotFoundError(user_id)
        return profile

    @staticmethod
    def create_profile(db: Session, user_id: int, data: ProfileCreate):
        existing = profile_repository.get_profile_by_user_id(db, user_id)
        if existing:
            raise ProfileAlreadyExistsError(user_id)
        return profile_repository.create_profile(db, user_id, data)

    @staticmethod
    def update_profile(db: Session, user_id: int, data: ProfileUpdate):
        profile = profile_repository.get_profile_by_user_id(db, user_id)
        if not profile:
            raise ProfileNotFoundError(user_id)
        return profile_repository.update_profile(db, profile, data)

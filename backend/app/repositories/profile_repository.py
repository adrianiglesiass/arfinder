from sqlalchemy.orm import Session
from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileRepository:
    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> Profile | None:
        return db.query(Profile).filter(Profile.user_id == user_id).first()

    @staticmethod
    def create(db: Session, user_id: int, data: ProfileCreate) -> Profile:
        profile = Profile(user_id=user_id, **data.model_dump())
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def update(db: Session, profile: Profile, data: ProfileUpdate) -> Profile:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def update_photo(db: Session, profile: Profile, foto_url: str) -> Profile:
        profile.foto_url = foto_url
        db.commit()
        db.refresh(profile)
        return profile


profile_repository = ProfileRepository()

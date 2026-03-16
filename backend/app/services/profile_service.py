from sqlalchemy.orm import Session

from app.core.exceptions.profile import ProfileAlreadyExistsError, ProfileNotFoundError
from app.models.profile import ScheduleEnum, TypeEnum
from app.repositories import profile_repository
from app.schemas.profile import ProfileCreate, ProfileUpdate


def get_profile(db: Session, user_id: int):
    profile = profile_repository.get_profile_by_user_id(db, user_id)
    if not profile:
        raise ProfileNotFoundError(user_id)
    return profile


def create_profile(db: Session, user_id: int, data: ProfileCreate):
    existing = profile_repository.get_profile_by_user_id(db, user_id)
    if existing:
        raise ProfileAlreadyExistsError(user_id)
    return profile_repository.create_profile(db, user_id, data)


def update_profile(db: Session, user_id: int, data: ProfileUpdate):
    profile = profile_repository.get_profile_by_user_id(db, user_id)
    if not profile:
        raise ProfileNotFoundError(user_id)
    return profile_repository.update_profile(db, profile, data)


def search_profiles(
    db: Session,
    city: str | None = None,
    budget_max: int | None = None,
    has_pets: bool | None = None,
    is_smoker: bool | None = None,
    schedule: ScheduleEnum | None = None,
    profile_type: TypeEnum | None = None,
    gender: str | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
):
    return profile_repository.search_profiles(
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

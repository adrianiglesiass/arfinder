from operator import attrgetter

from sqlalchemy.orm import Session

from app.core.exceptions.profile import ProfileAlreadyExistsError, ProfileNotFoundError
from app.models.profile import Profile, ScheduleEnum, TypeEnum
from app.repositories import profile_repository
from app.schemas.profile import ProfileCreate, ProfileSummary, ProfileUpdate


def _profile_to_summary(profile: Profile) -> ProfileSummary:
    sorted_photos = sorted(profile.photos, key=attrgetter("order"))
    seen = set()
    photo_urls = []
    for photo in sorted_photos:
        if photo.photo_url in seen:
            continue
        seen.add(photo.photo_url)
        photo_urls.append(photo.photo_url)

    return ProfileSummary(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        age=profile.age,
        city=profile.city,
        has_pets=profile.has_pets,
        is_smoker=profile.is_smoker,
        type=profile.type,
        max_budget=profile.max_budget,
        schedule=profile.schedule,
        gender=profile.gender,
        room_description=profile.room_description,
        photo_urls=photo_urls,
    )


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


def delete_profile(db: Session, user_id: int):
    profile = profile_repository.get_profile_by_user_id(db, user_id)
    if not profile:
        raise ProfileNotFoundError(user_id)
    profile_repository.delete_profile(db, profile)


def get_public_profile(db: Session, profile_id: int):
    profile = profile_repository.get_profile_by_id(db, profile_id)
    if not profile:
        raise ProfileNotFoundError(profile_id)
    return profile


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
    skip: int = 0,
    limit: int = 20,
    exclude_user_id: int | None = None,
) -> list[ProfileSummary]:
    profiles = profile_repository.search_profiles(
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
        exclude_user_id=exclude_user_id,
    )

    profile_summaries = []
    for profile in profiles:
        summary = _profile_to_summary(profile)
        profile_summaries.append(summary)

    return profile_summaries

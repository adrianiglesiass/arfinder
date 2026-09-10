from sqlalchemy.orm import Session

from app.core.exceptions.favorite import FavoriteSelfError
from app.repositories import favorite_repository, profile_repository
from app.schemas.profile import ProfileSummary
from app.services import profile_service


def favorite_profile(db: Session, current_user_id: int, profile_id: int) -> None:
    target_user_id = _get_target_user_id(db, profile_id)
    if target_user_id == current_user_id:
        raise FavoriteSelfError()
    favorite_repository.add(db, current_user_id, target_user_id)


def unfavorite_profile(db: Session, current_user_id: int, profile_id: int) -> None:
    target_user_id = _get_target_user_id(db, profile_id)
    favorite_repository.remove(db, current_user_id, target_user_id)


def list_favorites(db: Session, current_user_id: int) -> list[ProfileSummary]:
    ids = favorite_repository.list_target_user_ids(db, current_user_id)
    profiles = profile_repository.get_profiles_by_user_ids(
        db, [user_id for user_id in ids if user_id != current_user_id]
    )
    return profile_service.build_profile_summaries(profiles)


def _get_target_user_id(db: Session, profile_id: int) -> int:
    profile = profile_service.get_public_profile(db, profile_id)
    return profile.user_id

from sqlalchemy.orm import Session

from app.core.exceptions.block import BlockSelfError
from app.repositories import block_repository, profile_repository
from app.schemas.profile import ProfileSummary
from app.services import profile_service


def block_profile(db: Session, current_user_id: int, profile_id: int) -> None:
    blocked_user_id = _get_target_user_id(db, profile_id)
    if blocked_user_id == current_user_id:
        raise BlockSelfError()
    block_repository.add(db, current_user_id, blocked_user_id)


def unblock_profile(db: Session, current_user_id: int, profile_id: int) -> None:
    blocked_user_id = _get_target_user_id(db, profile_id)
    block_repository.remove(db, current_user_id, blocked_user_id)


def list_blocked(db: Session, current_user_id: int) -> list[ProfileSummary]:
    ids = block_repository.list_blocked_user_ids(db, current_user_id)
    profiles = profile_repository.get_profiles_by_user_ids(
        db, [user_id for user_id in ids if user_id != current_user_id]
    )
    return profile_service.build_profile_summaries(profiles)


def excluded_user_ids(db: Session, user_id: int) -> list[int]:
    blocked = block_repository.list_blocked_user_ids(db, user_id, limit=None)
    blockers = block_repository.list_blocker_user_ids(db, user_id, limit=None)
    return list(dict.fromkeys(blocked + blockers))


def _get_target_user_id(db: Session, profile_id: int) -> int:
    profile = profile_service.get_public_profile(db, profile_id)
    return profile.user_id

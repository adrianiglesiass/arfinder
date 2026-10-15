from sqlalchemy.orm import Session

from app.core.exceptions.block import BlockSelfError
from app.core.exceptions.profile import ProfileNotFoundError
from app.models.profile import Profile
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


def is_blocked_between(db: Session, user_a_id: int, user_b_id: int) -> bool:
    return block_repository.exists_between(db, user_a_id, user_b_id)


def get_visible_profile(db: Session, profile_id: int, viewer_id: int | None) -> Profile:
    """Perfil público salvo para quien su dueño ha bloqueado (404, como inexistente).

    Vive aquí y no en profile_service porque block_service ya depende de
    profile_service (spec feat-block-cuts-messaging, punto 6).
    """
    profile = profile_service.get_public_profile(db, profile_id)
    if viewer_id is None or viewer_id == profile.user_id:
        return profile
    hidden_from_viewer = block_repository.is_blocked(
        db, profile.user_id, viewer_id
    ) and not block_repository.is_blocked(db, viewer_id, profile.user_id)
    if hidden_from_viewer:
        raise ProfileNotFoundError(profile_id)
    return profile


def _get_target_user_id(db: Session, profile_id: int) -> int:
    profile = profile_service.get_public_profile(db, profile_id)
    return profile.user_id

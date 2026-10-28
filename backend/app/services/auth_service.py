import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from app.clients.storage_client import delete_image
from app.models.user import User
from app.repositories import (
    profile_photo_repository,
    profile_repository,
    user_repository,
)
from app.core.exceptions.auth import (
    AccountDeletionError,
    InvalidCredentialsError,
)
from app.core.security import forget_user_sessions, insforge

logger = logging.getLogger(__name__)

_INSFORGE_DELETE_TIMEOUT_SECONDS = 5.0


def _delete_user_record(db: Session, user_id: int) -> str | None:
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise InvalidCredentialsError()
    insforge_id = user.insforge_id

    profile = profile_repository.get_profile_by_user_id(db, user.id)
    photo_urls = []
    if profile:
        photo_urls = [
            photo.photo_url
            for photo in profile_photo_repository.get_photos_by_profile(db, profile.id)
        ]

    user_repository.delete_user(db, user)
    for photo_url in photo_urls:
        delete_image(photo_url)
    return insforge_id


async def delete_user(db: Session, user: User):
    insforge_id = user.insforge_id
    if insforge_id:
        try:
            await asyncio.wait_for(
                insforge.auth.delete_users([insforge_id]),
                timeout=_INSFORGE_DELETE_TIMEOUT_SECONDS,
            )
        except AccountDeletionError:
            raise
        except Exception:
            logger.exception(
                "failed to delete insforge user insforge_id=%s",
                insforge_id,
            )
            raise AccountDeletionError() from None
        await forget_user_sessions(insforge_id)

    await run_in_threadpool(_delete_user_record, db, user.id)


def record_terms_consent(db: Session, user: User, terms_version: str) -> User:
    """Store explicit acceptance of the legal documents (Terms, Privacy, 18+).

    Re-accepting overwrites the previous record with the new version and time.
    """
    db_user = user_repository.get_user_by_id(db, user.id)
    if not db_user:
        raise InvalidCredentialsError()
    return user_repository.update_terms_consent(
        db,
        db_user,
        accepted_at=datetime.now(timezone.utc),
        terms_version=terms_version,
    )

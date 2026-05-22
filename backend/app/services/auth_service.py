import asyncio
import logging

from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from app.models.user import User
from app.repositories import user_repository
from app.core.exceptions.auth import (
    InvalidCredentialsError,
)
from app.core.security import insforge

logger = logging.getLogger(__name__)

_INSFORGE_DELETE_TIMEOUT_SECONDS = 5.0


def _delete_user_record(db: Session, user_id: int) -> str | None:
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise InvalidCredentialsError()
    insforge_id = user.insforge_id
    user_repository.delete_user(db, user)
    return insforge_id


async def delete_user(db: Session, user: User):
    insforge_id = await run_in_threadpool(_delete_user_record, db, user.id)

    if insforge_id:
        try:
            await asyncio.wait_for(
                insforge.auth.delete_users([insforge_id]),
                timeout=_INSFORGE_DELETE_TIMEOUT_SECONDS,
            )
        except Exception:
            logger.exception(
                "failed to delete insforge user insforge_id=%s",
                insforge_id,
            )

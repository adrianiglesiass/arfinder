import logging

from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories import user_repository

logger = logging.getLogger(__name__)


def delete_user_completely(db: Session, user: User) -> None:
    user = user_repository.get_user_by_id(db, user.id)
    if user:
        user_repository.delete_user(db, user)


def cleanup_orphaned_users(db: Session) -> dict:
    orphaned_users = db.query(User).filter(User.insforge_id.is_(None)).all()
    deleted_count = 0

    for user in orphaned_users:
        try:
            user_repository.delete_user(db, user)
            deleted_count += 1
        except Exception:
            logger.exception("failed to delete orphaned user_id=%s", user.id)

    return {"deleted_count": deleted_count, "total_scanned": len(orphaned_users)}

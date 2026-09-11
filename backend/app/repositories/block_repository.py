from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions.block import BlockAlreadyExistsError
from app.models.block import UserBlock


def add(db: Session, blocker_user_id: int, blocked_user_id: int) -> UserBlock:
    if is_blocked(db, blocker_user_id, blocked_user_id):
        raise BlockAlreadyExistsError()

    block = UserBlock(blocker_user_id=blocker_user_id, blocked_user_id=blocked_user_id)
    db.add(block)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise BlockAlreadyExistsError() from None
    db.refresh(block)
    return block


def remove(db: Session, blocker_user_id: int, blocked_user_id: int) -> bool:
    block = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_user_id == blocker_user_id,
            UserBlock.blocked_user_id == blocked_user_id,
        )
        .first()
    )
    if block is None:
        return False
    db.delete(block)
    db.commit()
    return True


def list_blocked_user_ids(
    db: Session, blocker_user_id: int, limit: int | None = 200
) -> list[int]:
    query = (
        db.query(UserBlock.blocked_user_id)
        .filter(UserBlock.blocker_user_id == blocker_user_id)
        .order_by(UserBlock.created_at.desc(), UserBlock.id.desc())
    )
    if limit is not None:
        query = query.limit(limit)
    return [row[0] for row in query.all()]


def list_blocker_user_ids(
    db: Session, blocked_user_id: int, limit: int | None = 200
) -> list[int]:
    query = (
        db.query(UserBlock.blocker_user_id)
        .filter(UserBlock.blocked_user_id == blocked_user_id)
        .order_by(UserBlock.created_at.desc(), UserBlock.id.desc())
    )
    if limit is not None:
        query = query.limit(limit)
    return [row[0] for row in query.all()]


def is_blocked(db: Session, blocker_user_id: int, blocked_user_id: int) -> bool:
    exists = db.query(
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_user_id == blocker_user_id,
            UserBlock.blocked_user_id == blocked_user_id,
        )
        .exists()
    ).scalar()
    return bool(exists)

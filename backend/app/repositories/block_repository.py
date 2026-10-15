from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions.block import BlockAlreadyExistsError
from app.models.block import UserBlock
from app.models.conversation import Conversation


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


def exists_between(db: Session, user_a_id: int, user_b_id: int) -> bool:
    exists = db.query(
        db.query(UserBlock)
        .filter(
            or_(
                and_(
                    UserBlock.blocker_user_id == user_a_id,
                    UserBlock.blocked_user_id == user_b_id,
                ),
                and_(
                    UserBlock.blocker_user_id == user_b_id,
                    UserBlock.blocked_user_id == user_a_id,
                ),
            )
        )
        .exists()
    ).scalar()
    return bool(exists)


def is_conversation_blocked(db: Session, conversation_id: int) -> bool:
    exists = db.query(
        db.query(UserBlock)
        .join(
            Conversation,
            or_(
                and_(
                    UserBlock.blocker_user_id == Conversation.user1_id,
                    UserBlock.blocked_user_id == Conversation.user2_id,
                ),
                and_(
                    UserBlock.blocker_user_id == Conversation.user2_id,
                    UserBlock.blocked_user_id == Conversation.user1_id,
                ),
            ),
        )
        .filter(Conversation.id == conversation_id)
        .exists()
    ).scalar()
    return bool(exists)

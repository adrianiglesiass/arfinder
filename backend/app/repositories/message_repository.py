from datetime import UTC, datetime
from typing import Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.message import Message


def get_message(db: Session, message_id: int) -> Message | None:
    return db.query(Message).filter(Message.id == message_id).first()


def mark_as_read(db: Session, message: Message) -> Message:
    message.is_read = True
    message.read_at = datetime.now(UTC)
    db.commit()
    db.refresh(message)
    return message


def get_messages_by_conversation(
    db: Session,
    conversation_id: int,
    limit: int = 50,
    before_id: int | None = None,
) -> list[Message]:
    query = db.query(Message).filter(Message.conversation_id == conversation_id)
    if before_id is not None:
        query = query.filter(Message.id < before_id)
    rows = query.order_by(Message.id.desc()).limit(limit).all()
    return list(reversed(rows))


def mark_conversation_as_read(
    db: Session,
    conversation_id: int,
    current_user_id: int,
) -> None:
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user_id,
        Message.is_read.is_(False),
    ).update({"is_read": True, "read_at": datetime.now(UTC)})
    db.commit()


def get_last_messages_for_conversations(
    db: Session, conversation_ids: Iterable[int]
) -> dict[int, Message]:
    ids = list(conversation_ids)
    if not ids:
        return {}
    sub = (
        db.query(
            Message.conversation_id.label("conversation_id"),
            func.max(Message.id).label("max_id"),
        )
        .filter(Message.conversation_id.in_(ids))
        .group_by(Message.conversation_id)
        .subquery()
    )
    rows = db.query(Message).join(sub, Message.id == sub.c.max_id).all()
    return {m.conversation_id: m for m in rows}


def get_unread_counts_for_conversations(
    db: Session, conversation_ids: Iterable[int], current_user_id: int
) -> dict[int, int]:
    ids = list(conversation_ids)
    if not ids:
        return {}
    rows = (
        db.query(Message.conversation_id, func.count(Message.id))
        .filter(
            Message.conversation_id.in_(ids),
            Message.sender_id != current_user_id,
            Message.is_read.is_(False),
        )
        .group_by(Message.conversation_id)
        .all()
    )
    return {conv_id: count for conv_id, count in rows}


def create_message(
    db: Session,
    conversation_id: int,
    sender_id: int,
    content: str,
) -> Message:
    message = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content,
        sent_at=datetime.now(UTC),
        is_read=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

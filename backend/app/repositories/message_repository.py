from datetime import UTC, datetime

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
    return query.order_by(Message.sent_at.asc()).limit(limit).all()


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

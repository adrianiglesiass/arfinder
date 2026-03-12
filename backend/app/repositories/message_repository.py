from datetime import UTC, datetime
from sqlalchemy.orm import Session
from app.models.message import Message


def get_message(db: Session, message_id: int) -> Message | None:
    return db.query(Message).filter(Message.id == message_id).first()


def mark_as_read(db: Session, message: Message) -> Message:
    message.leido = True
    message.leido_at = datetime.now(UTC)
    db.commit()
    db.refresh(message)
    return message

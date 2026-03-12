from sqlalchemy.orm import Session
from app.repositories import message_repository
from app.core.exceptions.message import MessageNotFoundError, MessageAccessDeniedError


def mark_message_as_read(db: Session, message_id: int, user_id: int):
    message = message_repository.get_message(db, message_id)
    if not message:
        raise MessageNotFoundError(message_id=message_id)

    if message.sender_id == user_id:
        raise MessageAccessDeniedError(message_id=message_id)

    return message_repository.mark_as_read(db, message)

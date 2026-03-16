from sqlalchemy.orm import Session
from app.models.message import Message
from app.repositories import message_repository
from app.repositories.message_repository import create_message
from app.core.exceptions.message import MessageNotFoundError, MessageAccessDeniedError
from app.services.conversation_service import get_conversation_or_raise


def mark_message_as_read(db: Session, message_id: int, user_id: int):
    message = message_repository.get_message(db, message_id)
    if not message:
        raise MessageNotFoundError(message_id=message_id)

    if message.sender_id == user_id:
        raise MessageAccessDeniedError(message_id=message_id)

    return message_repository.mark_as_read(db, message)


def get_conversation_history(
    db: Session,
    conversation_id: int,
    current_user_id: int,
    limit: int = 50,
    before_id: int | None = None,
) -> list[Message]:
    get_conversation_or_raise(db, conversation_id, current_user_id)
    return message_repository.get_messages_by_conversation(
        db, conversation_id, limit, before_id
    )


def mark_conversation_messages_as_read(
    db: Session,
    conversation_id: int,
    current_user_id: int,
) -> None:
    get_conversation_or_raise(db, conversation_id, current_user_id)
    message_repository.mark_conversation_as_read(db, conversation_id, current_user_id)


async def send_message(
    db: Session,
    conversation_id: int,
    sender_id: int,
    content: str,
) -> Message:
    get_conversation_or_raise(db, conversation_id, sender_id)
    return create_message(db, conversation_id, sender_id, content)


def build_message_payload(message, user) -> dict:
    sender_profile = user.profile
    sender_photo = None
    if sender_profile and sender_profile.photos:
        sender_photo = next((p for p in sender_profile.photos if p.is_main), None)
    return {
        "type": "message",
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": user.id,
        "sender_name": sender_profile.name if sender_profile else None,
        "sender_photo": sender_photo.photo_url if sender_photo else None,
        "content": message.content,
        "sent_at": message.sent_at.isoformat(),
        "is_read": message.is_read,
    }

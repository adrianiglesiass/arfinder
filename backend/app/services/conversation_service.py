from sqlalchemy.orm import Session

from app.core.exceptions.conversation import (
    CannotMessageYourselfError,
    ConversationAccessDeniedError,
    ConversationNotFoundError,
)


from app.models.conversation import Conversation
from app.repositories.conversation_repository import (
    create_conversation,
    get_conversation_between_users,
    get_conversation_by_id,
    get_conversations_by_user,
)


def get_or_create_conversation(
    db: Session, current_user_id: int, other_user_id: int
) -> Conversation:
    if current_user_id == other_user_id:
        raise CannotMessageYourselfError()

    existing = get_conversation_between_users(db, current_user_id, other_user_id)
    if existing:
        return existing

    return create_conversation(db, current_user_id, other_user_id)


def list_my_conversations(db: Session, current_user_id: int) -> list[Conversation]:
    return get_conversations_by_user(db, current_user_id)


def get_conversation_or_raise(
    db: Session, conversation_id: int, current_user_id: int
) -> Conversation:
    conversation = get_conversation_by_id(db, conversation_id)
    if not conversation:
        raise ConversationNotFoundError()
    if current_user_id not in (conversation.user1_id, conversation.user2_id):
        raise ConversationAccessDeniedError()
    return conversation

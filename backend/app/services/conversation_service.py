from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions.conversation import (
    CannotMessageYourselfError,
    ConversationAccessDeniedError,
    ConversationNotFoundError,
)
from app.core.exceptions.user import UserNotFoundError
from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories import message_repository, user_repository
from app.repositories.conversation_repository import (
    create_conversation,
    get_conversation_between_users,
    get_conversation_by_id,
    get_conversations_by_user,
)
from app.repositories.message_repository import create_message
from app.schemas.conversation import ConversationResponse, ParticipantSummary


def get_or_create_conversation(
    db: Session, current_user_id: int, other_user_id: int
) -> Conversation:
    if current_user_id == other_user_id:
        raise CannotMessageYourselfError()

    if not user_repository.get_user_by_id(db, other_user_id):
        raise UserNotFoundError(other_user_id)

    existing = get_conversation_between_users(db, current_user_id, other_user_id)
    if existing:
        return existing

    try:
        return create_conversation(db, current_user_id, other_user_id)
    except IntegrityError:
        # Dos requests concurrentes pueden insertar a la vez: el perdedor
        # recibe un IntegrityError por la unique constraint y debe recuperar
        # la conversación ya creada por el ganador.
        db.rollback()
        conversation = get_conversation_between_users(
            db, current_user_id, other_user_id
        )
        if conversation is None:
            raise
        return conversation


def create_or_get_conversation_with_status(
    db: Session, current_user_id: int, other_user_id: int
) -> tuple[Conversation, bool]:
    was_new = get_conversation_between_users(db, current_user_id, other_user_id) is None
    conversation = get_or_create_conversation(db, current_user_id, other_user_id)
    return conversation, was_new


def send_message_to_user(
    db: Session, current_user_id: int, recipient_user_id: int, content: str
) -> Message:
    conversation = get_or_create_conversation(db, current_user_id, recipient_user_id)
    return create_message(db, conversation.id, current_user_id, content)


def send_message_with_status(
    db: Session, current_user_id: int, recipient_user_id: int, content: str
) -> tuple[Message, bool]:
    was_new = (
        get_conversation_between_users(db, current_user_id, recipient_user_id) is None
    )
    message = send_message_to_user(db, current_user_id, recipient_user_id, content)
    return message, was_new


def list_my_conversations(db: Session, current_user_id: int) -> list[Conversation]:
    return get_conversations_by_user(db, current_user_id)


def list_my_conversation_responses(
    db: Session, current_user_id: int
) -> list[ConversationResponse]:
    return build_conversation_responses(
        db, list_my_conversations(db, current_user_id), current_user_id
    )


def get_conversation_or_raise(
    db: Session, conversation_id: int, current_user_id: int
) -> Conversation:
    conversation = get_conversation_by_id(db, conversation_id)
    if not conversation:
        raise ConversationNotFoundError()
    if current_user_id not in (conversation.user1_id, conversation.user2_id):
        raise ConversationAccessDeniedError()
    return conversation


def build_conversation_response(
    db: Session, conversation: Conversation, current_user_id: int
) -> ConversationResponse:
    (response,) = build_conversation_responses(db, [conversation], current_user_id)
    return response


def build_conversation_responses(
    db: Session, conversations: list[Conversation], current_user_id: int
) -> list[ConversationResponse]:
    conversation_ids = [c.id for c in conversations]
    last_messages = message_repository.get_last_messages_for_conversations(
        db, conversation_ids
    )
    unread_counts = message_repository.get_unread_counts_for_conversations(
        db, conversation_ids, current_user_id
    )

    def _last_activity(conv: Conversation):
        last = last_messages.get(conv.id)
        return last.sent_at if last else conv.created_at

    ordered = sorted(conversations, key=_last_activity, reverse=True)

    return [
        ConversationResponse(
            id=conv.id,
            user1_id=conv.user1_id,
            user2_id=conv.user2_id,
            other_user=_get_other_user_summary(conv, current_user_id, db),
            last_message=last_messages.get(conv.id),
            unread_count=unread_counts.get(conv.id, 0),
        )
        for conv in ordered
    ]


def _get_other_user_summary(
    conv: Conversation, current_user_id: int, db: Session
) -> ParticipantSummary | None:
    other_user = conv.user2 if conv.user1_id == current_user_id else conv.user1
    if not other_user or not other_user.profile:
        return None
    photos = sorted(other_user.profile.photos, key=lambda p: (p.order or 0, p.id))
    main_photo = next((p for p in photos if p.is_main), None) or (
        photos[0] if photos else None
    )
    return ParticipantSummary(
        user_id=other_user.id,
        profile_id=other_user.profile.id,
        name=other_user.profile.name,
        photo_url=main_photo.photo_url if main_photo else None,
    )

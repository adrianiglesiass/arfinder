from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions.auth import InvalidCredentialsError
from app.models.conversation import Conversation
from app.models.user import User
from app.repositories import (
    conversation_repository,
    message_repository,
    profile_repository,
    user_repository,
)
from app.schemas.data_export import (
    ExportConversation,
    ExportMessage,
    ExportParticipant,
    ExportProfile,
    ExportUser,
    UserDataExport,
)


def _other_participant(conversation: Conversation, user_id: int) -> ExportParticipant:
    other: User | None = (
        conversation.user2 if conversation.user1_id == user_id else conversation.user1
    )
    other_id = (
        conversation.user2_id
        if conversation.user1_id == user_id
        else conversation.user1_id
    )
    name = other.profile.name if other and other.profile else None
    # Never include the other party's email or any other contact data.
    return ExportParticipant(id=other_id, name=name)


def export_user_data(db: Session, user_id: int) -> UserDataExport:
    """Build a portable copy of all personal data held about the user."""
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise InvalidCredentialsError()

    profile = profile_repository.get_profile_by_user_id(db, user_id)
    conversations = conversation_repository.get_conversations_by_user(db, user_id)

    messages_by_conversation = defaultdict(list)
    for message in message_repository.get_all_messages_for_conversations(
        db, (c.id for c in conversations)
    ):
        messages_by_conversation[message.conversation_id].append(
            ExportMessage(
                id=message.id,
                sender_id=message.sender_id,
                is_mine=message.sender_id == user_id,
                content=message.content,
                sent_at=message.sent_at,
                is_read=message.is_read,
                read_at=message.read_at,
            )
        )

    return UserDataExport(
        generated_at=datetime.now(timezone.utc),
        user=ExportUser.model_validate(user),
        profile=ExportProfile.model_validate(profile) if profile else None,
        conversations=[
            ExportConversation(
                id=c.id,
                created_at=c.created_at,
                other_participant=_other_participant(c, user_id),
                messages=messages_by_conversation[c.id],
            )
            for c in conversations
        ],
    )

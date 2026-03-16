from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session


from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.message import Message
from app.models.user import User
from app.repositories import message_repository
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import MessageResponse
from app.services.conversation_service import (
    get_conversation_or_raise,
    get_or_create_conversation,
    list_my_conversations,
)
from app.services.message_service import mark_conversation_messages_as_read


router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=201)
def create_or_get_conversation(
    body: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_or_create_conversation(db, current_user.id, body.other_user_id)


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = list_my_conversations(db, current_user.id)

    # Conversación con último mensaje y no leídos
    result = []
    for conv in conversations:
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.sent_at.desc())
            .first()
        )
        unread_count = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv.id,
                Message.sender_id != current_user.id,
                Message.is_read.is_(False),
            )
            .count()
        )
        result.append(
            ConversationResponse(
                id=conv.id,
                user1_id=conv.user1_id,
                user2_id=conv.user2_id,
                last_message=last_msg,
                unread_count=unread_count,
            )
        )

    return result


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def get_conversation_messages(
    conversation_id: int,
    limit: int = Query(default=50, le=100),
    before_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_conversation_or_raise(db, conversation_id, current_user.id)
    return message_repository.get_messages_by_conversation(
        db, conversation_id, limit, before_id
    )


@router.patch("/{conversation_id}/read", status_code=204)
def mark_as_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark_conversation_messages_as_read(db, conversation_id, current_user.id)

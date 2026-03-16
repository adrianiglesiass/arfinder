from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.message import Message
from app.models.user import User
from app.repositories import message_repository
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ParticipantSummary,
)
from app.schemas.message import MessageResponse
from app.services.conversation_service import (
    get_conversation_or_raise,
    get_or_create_conversation,
    list_my_conversations,
)
from app.services.message_service import mark_conversation_messages_as_read

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _get_other_user_summary(
    conv, current_user_id: int, db: Session
) -> ParticipantSummary | None:
    other_user = conv.user2 if conv.user1_id == current_user_id else conv.user1
    if not other_user or not other_user.profile:
        return None
    main_photo = next((p for p in other_user.profile.photos if p.is_main), None)
    return ParticipantSummary(
        user_id=other_user.id,
        name=other_user.profile.name,
        photo_url=main_photo.photo_url if main_photo else None,
    )


def _build_conversation_response(
    conv, current_user_id: int, db: Session
) -> ConversationResponse:
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
            Message.sender_id != current_user_id,
            Message.is_read.is_(False),
        )
        .count()
    )
    return ConversationResponse(
        id=conv.id,
        user1_id=conv.user1_id,
        user2_id=conv.user2_id,
        other_user=_get_other_user_summary(conv, current_user_id, db),
        last_message=last_msg,
        unread_count=unread_count,
    )


@router.post("", response_model=ConversationResponse, status_code=201)
def create_or_get_conversation(
    body: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = get_or_create_conversation(db, current_user.id, body.other_user_id)
    return ConversationResponse(
        id=conv.id,
        user1_id=conv.user1_id,
        user2_id=conv.user2_id,
        other_user=_get_other_user_summary(conv, current_user.id, db),
        last_message=None,
        unread_count=0,
    )


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = list_my_conversations(db, current_user.id)
    return [
        _build_conversation_response(conv, current_user.id, db)
        for conv in conversations
    ]


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = get_conversation_or_raise(db, conversation_id, current_user.id)
    return _build_conversation_response(conv, current_user.id, db)


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

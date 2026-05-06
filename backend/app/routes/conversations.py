from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.openapi import PROTECTED
from app.core.rate_limit import message_rate_limiter
from app.db.database import get_db
from app.models.message import Message
from app.models.user import User
from app.repositories import message_repository
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ParticipantSummary,
)
from app.schemas.message import MessageCreate, MessageResponse
from app.core.realtime import manager as realtime_manager
from app.repositories.conversation_repository import get_conversation_between_users
from app.services import message_service
from app.services.conversation_service import (
    get_conversation_or_raise,
    get_or_create_conversation,
    list_my_conversations,
    send_message_to_user,
)
from app.services.message_service import mark_conversation_messages_as_read

router = APIRouter(prefix="/conversations", tags=["conversations"], responses=PROTECTED)


def _get_other_user_summary(
    conv, current_user_id: int, db: Session
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
async def create_or_get_conversation(
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
async def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = list_my_conversations(db, current_user.id)
    conv_ids = [c.id for c in conversations]
    last_messages = message_repository.get_last_messages_for_conversations(db, conv_ids)
    unread_counts = message_repository.get_unread_counts_for_conversations(
        db, conv_ids, current_user.id
    )
    return [
        ConversationResponse(
            id=conv.id,
            user1_id=conv.user1_id,
            user2_id=conv.user2_id,
            other_user=_get_other_user_summary(conv, current_user.id, db),
            last_message=last_messages.get(conv.id),
            unread_count=unread_counts.get(conv.id, 0),
        )
        for conv in conversations
    ]


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = get_conversation_or_raise(db, conversation_id, current_user.id)
    return _build_conversation_response(conv, current_user.id, db)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_conversation_messages(
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
async def mark_as_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark_conversation_messages_as_read(db, conversation_id, current_user.id)


@router.post(
    "/{conversation_id}/messages", response_model=MessageResponse, status_code=201
)
async def send_new_message(
    conversation_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(message_rate_limiter),
):
    return await message_service.send_message(
        db, conversation_id, current_user.id, body.content
    )


@router.post(
    "/with/{recipient_user_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
async def send_message_lazy(
    recipient_user_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(message_rate_limiter),
):
    was_new = (
        get_conversation_between_users(db, current_user.id, recipient_user_id) is None
    )
    message = send_message_to_user(db, current_user.id, recipient_user_id, body.content)
    if was_new:
        await realtime_manager.broadcast_to_user(
            recipient_user_id,
            {
                "event": "conversation_created",
                "conversation_id": message.conversation_id,
            },
        )
    return message

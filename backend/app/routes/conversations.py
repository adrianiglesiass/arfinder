from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.dependencies import get_current_user
from app.core.openapi import PROTECTED
from app.core.rate_limit import message_rate_limiter
from app.core.realtime import manager as realtime_manager
from app.db.database import get_db
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import MessageCreate, MessageResponse
from app.services import message_service
from app.services.conversation_service import (
    build_conversation_response,
    create_or_get_conversation_with_status,
    get_conversation_or_raise,
    list_my_conversation_responses,
    send_message_with_status,
)

router = APIRouter(prefix="/conversations", tags=["conversations"], responses=PROTECTED)


@router.post("", response_model=ConversationResponse, status_code=201)
async def create_or_get_conversation(
    body: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    def _persist():
        conversation, was_new = create_or_get_conversation_with_status(
            db, current_user.id, body.other_user_id
        )
        response = build_conversation_response(db, conversation, current_user.id)
        return was_new, response

    was_new, response = await run_in_threadpool(_persist)
    if was_new:
        await realtime_manager.broadcast_to_user(
            body.other_user_id,
            {
                "event": "conversation_created",
                "conversation_id": response.id,
            },
        )
    return response


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_my_conversation_responses(db, current_user.id)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = get_conversation_or_raise(db, conversation_id, current_user.id)
    return build_conversation_response(db, conversation, current_user.id)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def get_conversation_messages(
    conversation_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    before_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return message_service.get_conversation_history(
        db, conversation_id, current_user.id, limit, before_id
    )


@router.patch("/{conversation_id}/read", status_code=204)
def mark_as_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message_service.mark_conversation_messages_as_read(
        db, conversation_id, current_user.id
    )


@router.post(
    "/{conversation_id}/messages", response_model=MessageResponse, status_code=201
)
def send_new_message(
    conversation_id: int,
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(message_rate_limiter),
):
    return message_service.send_message(
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
    def _persist():
        message, was_new = send_message_with_status(
            db, current_user.id, recipient_user_id, body.content
        )
        return was_new, message

    was_new, message = await run_in_threadpool(_persist)
    if was_new:
        await realtime_manager.broadcast_to_user(
            recipient_user_id,
            {
                "event": "conversation_created",
                "conversation_id": message.conversation_id,
            },
        )
    return message

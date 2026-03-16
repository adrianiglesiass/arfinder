from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.core.connection_manager import manager
from app.core.security import decode_token
from app.db.database import get_db
from app.repositories.user_repository import get_user_by_id
from app.services.conversation_service import get_conversation_or_raise
from app.services.message_service import send_message, mark_message_as_read
from app.core.exceptions.conversation import (
    ConversationAccessDeniedError,
    ConversationNotFoundError,
)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/conversations/{conversation_id}")
async def websocket_chat(
    conversation_id: int,
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db),
):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    user = get_user_by_id(db, user_id)
    if not user:
        await websocket.close(code=4001)
        return

    try:
        get_conversation_or_raise(db, conversation_id, user.id)
    except (ConversationNotFoundError, ConversationAccessDeniedError):
        await websocket.close(code=4003)
        return

    await manager.connect(conversation_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                message = await send_message(db, conversation_id, user.id, content)

                sender_profile = user.profile
                sender_photo = (
                    next((p for p in sender_profile.photos if p.is_main), None)
                    if sender_profile and sender_profile.photos
                    else None
                )

                await manager.broadcast(
                    conversation_id,
                    {
                        "type": "message",
                        "id": message.id,
                        "conversation_id": conversation_id,
                        "sender_id": user.id,
                        "sender_name": sender_profile.name if sender_profile else None,
                        "sender_photo": sender_photo.photo_url
                        if sender_photo
                        else None,
                        "content": message.content,
                        "sent_at": message.sent_at.isoformat(),
                        "is_read": message.is_read,
                    },
                )

            elif msg_type == "read":
                message_id = data.get("message_id")
                if not message_id:
                    continue

                mark_message_as_read(db, message_id, user.id)

                await manager.broadcast(
                    conversation_id,
                    {
                        "type": "read",
                        "message_id": message_id,
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)

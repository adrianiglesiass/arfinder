from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.core.connection_manager import manager
from app.core.exceptions.conversation import (
    ConversationAccessDeniedError,
    ConversationNotFoundError,
)
from app.core.security import validate_insforge_token
from app.core.auth_utils import get_or_create_local_user
from app.db.database import get_db
from app.services.conversation_service import get_conversation_or_raise
from app.services.message_service import (
    build_message_payload,
    mark_message_as_read,
    send_message,
)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/conversations/{conversation_id}")
async def websocket_chat(
    conversation_id: int,
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db),
):
    session = await validate_insforge_token(token)
    if not session or not session.user:
        await websocket.close(code=4001)
        return

    user = get_or_create_local_user(db, session.user)

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
                await manager.broadcast(
                    conversation_id,
                    build_message_payload(message, user),
                )

            elif msg_type == "read":
                message_id = data.get("message_id")
                if not message_id:
                    continue

                mark_message_as_read(db, message_id, user.id)
                await manager.broadcast(
                    conversation_id,
                    {"type": "read", "message_id": message_id},
                )

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)

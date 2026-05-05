import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.auth_utils import get_or_create_local_user
from app.core.realtime import manager
from app.core.security import validate_insforge_token
from app.db.database import SessionLocal
from app.repositories import conversation_repository

logger = logging.getLogger("app.routes.realtime")

router = APIRouter(tags=["realtime"])


def _is_participant(db: Session, conversation_id: int, user_id: int) -> bool:
    conversation = conversation_repository.get_conversation_by_id(db, conversation_id)
    if conversation is None:
        return False
    return user_id in (conversation.user1_id, conversation.user2_id)


@router.websocket("/ws/realtime")
async def realtime_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session = await validate_insforge_token(token)
    if not session or not session.user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db: Session = SessionLocal()
    try:
        user = get_or_create_local_user(db, session.user)
    except Exception:
        db.close()
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    user_id = user.id

    await websocket.accept()
    await manager.register(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            conversation_id = data.get("conversation_id")
            if not isinstance(conversation_id, int):
                await websocket.send_json(
                    {"event": "error", "error": "invalid_conversation_id"}
                )
                continue

            if action == "subscribe":
                if not _is_participant(db, conversation_id, user_id):
                    await websocket.send_json(
                        {
                            "event": "error",
                            "error": "forbidden",
                            "conversation_id": conversation_id,
                        }
                    )
                    continue
                await manager.subscribe(websocket, conversation_id)
                await websocket.send_json(
                    {"event": "subscribed", "conversation_id": conversation_id}
                )
            elif action == "unsubscribe":
                await manager.unsubscribe(websocket, conversation_id)
                await websocket.send_json(
                    {"event": "unsubscribed", "conversation_id": conversation_id}
                )
            else:
                await websocket.send_json({"event": "error", "error": "unknown_action"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"[realtime] ws closed with error: {e}")
    finally:
        await manager.disconnect(websocket)
        db.close()

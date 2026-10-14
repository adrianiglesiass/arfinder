import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.core.auth_utils import get_or_create_local_user
from app.core.exceptions.realtime import TooManySocketsError
from app.core.rate_limit import resolve_client_key
from app.core.realtime import MAX_MESSAGE_BYTES, listener, manager, ws_message_limiter
from app.core.security import validate_insforge_token
from app.db.database import SessionLocal
from app.repositories import conversation_repository

logger = logging.getLogger("app.routes.realtime")

router = APIRouter(tags=["realtime"])

WS_AUTH_SUBPROTOCOL = "bearer"

_TOO_MANY_SOCKETS_DETAIL = (
    "Demasiadas conexiones en tiempo real. "
    "Cierra alguna pestaña e inténtalo de nuevo en unos segundos."
)


def _resolve_user_id(insforge_user) -> int:
    with SessionLocal() as db:
        return get_or_create_local_user(db, insforge_user).id


def _is_participant(conversation_id: int, user_id: int) -> bool:
    with SessionLocal() as db:
        conversation = conversation_repository.get_conversation_by_id(
            db, conversation_id
        )
        if conversation is None:
            return False
        return user_id in (conversation.user1_id, conversation.user2_id)


def _extract_bearer_token(websocket: WebSocket) -> str | None:
    subprotocols = websocket.scope.get("subprotocols") or []
    if len(subprotocols) != 2 or subprotocols[0] != WS_AUTH_SUBPROTOCOL:
        return None
    token = subprotocols[1]
    return token if token else None


async def _deny_handshake(websocket: WebSocket) -> None:
    """Rechaza el handshake con 429 HTTP previo al upgrade.

    Si el servidor no soporta la extensión de respuesta de denegación, se
    cierra el socket con 1008 (política violada) como alternativa.
    """
    if "websocket.http.response" in websocket.scope.get("extensions", {}):
        await websocket.send_denial_response(
            JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": _TOO_MANY_SOCKETS_DETAIL},
                headers={"Retry-After": "10"},
            )
        )
    else:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)


async def _listen(websocket: WebSocket, user_id: int) -> None:
    """Bucle de mensajes: aplica tamaño máximo y tasa antes de procesar."""
    while True:
        text = await websocket.receive_text()
        if len(text.encode("utf-8")) > MAX_MESSAGE_BYTES:
            await websocket.close(code=status.WS_1009_MESSAGE_TOO_BIG)
            return
        if not ws_message_limiter.try_acquire(f"ws:{user_id}"):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        data = json.loads(text)
        action = data.get("action")
        conversation_id = data.get("conversation_id")
        if not isinstance(conversation_id, int):
            await websocket.send_json(
                {"event": "error", "error": "invalid_conversation_id"}
            )
            continue

        if action == "subscribe":
            allowed = await run_in_threadpool(_is_participant, conversation_id, user_id)
            if not allowed:
                await websocket.send_json(
                    {
                        "event": "error",
                        "error": "forbidden",
                        "conversation_id": conversation_id,
                    }
                )
                continue
            subscribed = await manager.subscribe(websocket, conversation_id)
            if not subscribed:
                await websocket.send_json(
                    {
                        "event": "error",
                        "error": "too_many_subscriptions",
                        "conversation_id": conversation_id,
                    }
                )
                continue
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


@router.get("/health/realtime")
def realtime_health():
    return {
        "listener_running": listener.is_running,
        "last_notify_at": listener.last_notify_at,
    }


@router.websocket("/ws/realtime")
async def realtime_endpoint(websocket: WebSocket):
    token = _extract_bearer_token(websocket)
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session = await validate_insforge_token(token)
    if not session or not session.user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = await run_in_threadpool(_resolve_user_id, session.user)
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    try:
        await manager.register(
            websocket, user_id, resolve_client_key(websocket.headers, websocket.client)
        )
    except TooManySocketsError:
        await _deny_handshake(websocket)
        return

    try:
        await websocket.accept(subprotocol=WS_AUTH_SUBPROTOCOL)
        await _listen(websocket, user_id)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"[realtime] ws closed with error: {e}")
    finally:
        await manager.disconnect(websocket)

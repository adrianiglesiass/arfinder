import asyncio
import json
import logging
import time
from typing import Any

import psycopg2
from fastapi import WebSocket
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from app.core.config import settings
from app.core.exceptions.realtime import TooManySocketsError
from app.core.rate_limit import SlidingWindowLimiter
from app.db.database import SessionLocal
from app.repositories import block_repository, message_repository

logger = logging.getLogger("app.realtime")
logger.setLevel(logging.INFO)

INITIAL_BACKOFF = 1
MAX_BACKOFF = 60
BACKOFF_FACTOR = 2
NOTIFY_CHANNEL = "insforge_realtime"
HEARTBEAT_SECONDS = 25

# Techos anti-abuso de la conexión en tiempo real (spec fix-abuse-cost-ceiling #54)
MAX_SOCKETS_PER_USER = 5
# El límite real es por usuario (arriba); el por IP solo amortigua tras CGNAT
# (operadores móviles, campus y oficinas comparten una sola IP pública).
MAX_SOCKETS_PER_IP = 50
# El frontend se suscribe a todas las conversaciones del usuario, así que el
# techo tiene que cubrir la bandeja real; cada `subscribe` cuesta una query y
# el usuario ya está limitado a MAX_SOCKETS_PER_USER sockets.
MAX_SUBSCRIPTIONS_PER_SOCKET = 100
# Segunda capa: la primera es `--ws-max-size 65536` en el CMD del Dockerfile,
# que uvicorn aplica ANTES de materializar el frame. Este check se ejecuta
# después de `receive_text()` y solo cubre lo que sí llegó a la app.
MAX_MESSAGE_BYTES = 8192
WS_MESSAGES_PER_WINDOW = 60
WS_WINDOW_SECONDS = 10.0

# Reutiliza el sliding window de rate_limit; no se duplica la implementación.
ws_message_limiter = SlidingWindowLimiter(
    WS_MESSAGES_PER_WINDOW, window_seconds=WS_WINDOW_SECONDS
)


class ConnectionManager:
    def __init__(self) -> None:
        self._by_conversation: dict[int, set[WebSocket]] = {}
        self._by_socket: dict[WebSocket, set[int]] = {}
        self._by_user: dict[int, set[WebSocket]] = {}
        self._socket_user: dict[WebSocket, int] = {}
        self._socket_ip: dict[WebSocket, str] = {}
        self._by_ip: dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def register(
        self, websocket: WebSocket, user_id: int, client_key: str
    ) -> None:
        """Registra un socket; lanza TooManySocketsError si supera los techos.

        La validación ocurre ANTES de tocar ningún mapa para que un rechazo no
        deje contadores huérfanos.
        """
        async with self._lock:
            user_sockets = self._by_user.get(user_id)
            if user_sockets and len(user_sockets) >= MAX_SOCKETS_PER_USER:
                raise TooManySocketsError()
            if self._by_ip.get(client_key, 0) >= MAX_SOCKETS_PER_IP:
                raise TooManySocketsError()
            self._by_socket.setdefault(websocket, set())
            self._by_user.setdefault(user_id, set()).add(websocket)
            self._socket_user[websocket] = user_id
            self._socket_ip[websocket] = client_key
            self._by_ip[client_key] = self._by_ip.get(client_key, 0) + 1

    async def subscribe(self, websocket: WebSocket, conversation_id: int) -> bool:
        """Suscribe el socket; devuelve False si supera MAX_SUBSCRIPTIONS_PER_SOCKET."""
        async with self._lock:
            subscriptions = self._by_socket.setdefault(websocket, set())
            if conversation_id in subscriptions:
                return True
            if len(subscriptions) >= MAX_SUBSCRIPTIONS_PER_SOCKET:
                return False
            self._by_conversation.setdefault(conversation_id, set()).add(websocket)
            subscriptions.add(conversation_id)
            return True

    async def unsubscribe(self, websocket: WebSocket, conversation_id: int) -> None:
        async with self._lock:
            sockets = self._by_conversation.get(conversation_id)
            if sockets:
                sockets.discard(websocket)
                if not sockets:
                    self._by_conversation.pop(conversation_id, None)
            convs = self._by_socket.get(websocket)
            if convs:
                convs.discard(conversation_id)

    async def disconnect(self, websocket: WebSocket) -> None:
        """Punto único de salida: libera cupos de conversación, usuario e IP."""
        async with self._lock:
            convs = self._by_socket.pop(websocket, set())
            for cid in convs:
                sockets = self._by_conversation.get(cid)
                if not sockets:
                    continue
                sockets.discard(websocket)
                if not sockets:
                    self._by_conversation.pop(cid, None)
            user_id = self._socket_user.pop(websocket, None)
            if user_id is not None:
                user_sockets = self._by_user.get(user_id)
                if user_sockets:
                    user_sockets.discard(websocket)
                    if not user_sockets:
                        self._by_user.pop(user_id, None)
            client_key = self._socket_ip.pop(websocket, None)
            if client_key is not None:
                remaining = self._by_ip.get(client_key, 0) - 1
                if remaining > 0:
                    self._by_ip[client_key] = remaining
                else:
                    self._by_ip.pop(client_key, None)

    async def has_subscribers(self, conversation_id: int) -> bool:
        async with self._lock:
            return bool(self._by_conversation.get(conversation_id))

    async def broadcast(self, conversation_id: int, message: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._by_conversation.get(conversation_id, set()))
        await self._send_all(targets, message)

    async def broadcast_to_user(self, user_id: int, message: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._by_user.get(user_id, set()))
        await self._send_all(targets, message)

    async def _send_all(
        self, targets: list[WebSocket], message: dict[str, Any]
    ) -> None:
        if not targets:
            return
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


manager = ConnectionManager()


def _parse_conversation_id(channel: str | None) -> int | None:
    if not channel or not channel.startswith("conversation:"):
        return None
    try:
        return int(channel.split(":", 1)[1])
    except (ValueError, IndexError):
        return None


def _load_message_content(message_id: object) -> str | None:
    if not isinstance(message_id, int):
        return None
    with SessionLocal() as db:
        message = message_repository.get_message(db, message_id)
        return message.content if message else None


def _is_conversation_blocked(conversation_id: int) -> bool:
    with SessionLocal() as db:
        return block_repository.is_conversation_blocked(db, conversation_id)


async def _should_deliver(conversation_id: int) -> bool:
    """Descarta eventos entre usuarios bloqueados (spec feat-block-cuts-messaging).

    Fail-open: la garantía principal está al escribir (no se crean mensajes con
    bloqueo); un fallo puntual de BD no debe cortar el tiempo real de todos.
    """
    try:
        blocked = await asyncio.to_thread(_is_conversation_blocked, conversation_id)
    except Exception as e:
        logger.error(
            f"[realtime] could not check block for conversation {conversation_id}: {e}"
        )
        return True
    return not blocked


async def _restore_omitted_content(event: str, data: object) -> object | None:
    if event != "new_message" or not isinstance(data, dict):
        return data
    if not data.get("content_omitted"):
        return data
    try:
        content = await asyncio.to_thread(_load_message_content, data.get("id"))
    except Exception as e:
        logger.error(
            f"[realtime] could not load omitted message {data.get('id')!r}: {e}"
        )
        return None
    if content is None:
        logger.warning(f"[realtime] omitted message {data.get('id')!r} not found")
        return None
    restored = {key: value for key, value in data.items() if key != "content_omitted"}
    restored["content"] = content
    return restored


class PostgresNotifyListener:
    def __init__(self) -> None:
        self.is_running = False
        self.last_notify_at: float | None = None
        self._task: asyncio.Task[None] | None = None
        self._conn = None

    async def start(self) -> None:
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self.is_running = False
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
            self._task = None

    async def _run(self) -> None:
        backoff = INITIAL_BACKOFF
        while self.is_running:
            try:
                dsn = settings.DATABASE_URL.replace(
                    "postgresql+psycopg2://", "postgresql://"
                )
                self._conn = psycopg2.connect(
                    dsn,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=3,
                )
                self._conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cursor = self._conn.cursor()
                cursor.execute(f"LISTEN {NOTIFY_CHANNEL};")
                logger.info(f"[realtime] LISTEN on '{NOTIFY_CHANNEL}' established")
                backoff = INITIAL_BACKOFF

                await self._consume_notifications()
            except Exception as e:
                logger.error(f"[realtime] listener error: {e}; retrying in {backoff}s")
                if self._conn is not None:
                    try:
                        self._conn.close()
                    except Exception:
                        pass
                    self._conn = None
                await asyncio.sleep(backoff)
                backoff = min(backoff * BACKOFF_FACTOR, MAX_BACKOFF)

    async def _consume_notifications(self) -> None:
        loop = asyncio.get_running_loop()
        conn = self._conn
        fileno = conn.fileno()
        readable = asyncio.Event()
        loop.add_reader(fileno, readable.set)
        try:
            while self.is_running:
                try:
                    await asyncio.wait_for(readable.wait(), timeout=HEARTBEAT_SECONDS)
                except asyncio.TimeoutError:
                    pass
                readable.clear()
                if conn.closed:
                    raise psycopg2.OperationalError("connection closed")
                conn.poll()
                while conn.notifies:
                    notify = conn.notifies.pop(0)
                    self.last_notify_at = time.time()
                    await self._dispatch(notify.payload)
        finally:
            loop.remove_reader(fileno)

    async def _dispatch(self, payload_str: str) -> None:
        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError:
            # Never log the payload itself: it may carry message content.
            logger.warning(
                "[realtime] invalid notify payload on '%s' (length=%d)",
                NOTIFY_CHANNEL,
                len(payload_str or ""),
            )
            return

        channel = payload.get("channel")
        event = payload.get("event")
        data = payload.get("payload")
        conversation_id = _parse_conversation_id(channel)
        if conversation_id is None or not event:
            return

        if not await manager.has_subscribers(conversation_id):
            return
        if not await _should_deliver(conversation_id):
            return

        data = await _restore_omitted_content(event, data)
        if data is None:
            return

        await manager.broadcast(
            conversation_id,
            {
                "event": event,
                "conversation_id": conversation_id,
                "payload": data,
            },
        )


listener = PostgresNotifyListener()

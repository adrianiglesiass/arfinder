import asyncio
import json
import logging
import select
from typing import Any

import psycopg2
from fastapi import WebSocket
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from app.core.config import settings

logger = logging.getLogger("app.realtime")
logger.setLevel(logging.INFO)

INITIAL_BACKOFF = 1
MAX_BACKOFF = 60
BACKOFF_FACTOR = 2
NOTIFY_CHANNEL = "insforge_realtime"


class ConnectionManager:
    def __init__(self) -> None:
        self._by_conversation: dict[int, set[WebSocket]] = {}
        self._by_socket: dict[WebSocket, set[int]] = {}
        self._by_user: dict[int, set[WebSocket]] = {}
        self._socket_user: dict[WebSocket, int] = {}
        self._lock = asyncio.Lock()

    async def register(self, websocket: WebSocket, user_id: int) -> None:
        async with self._lock:
            self._by_socket.setdefault(websocket, set())
            self._by_user.setdefault(user_id, set()).add(websocket)
            self._socket_user[websocket] = user_id

    async def subscribe(self, websocket: WebSocket, conversation_id: int) -> None:
        async with self._lock:
            self._by_conversation.setdefault(conversation_id, set()).add(websocket)
            self._by_socket.setdefault(websocket, set()).add(conversation_id)

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


class PostgresNotifyListener:
    def __init__(self) -> None:
        self.is_running = False
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
                self._conn = psycopg2.connect(dsn)
                self._conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cursor = self._conn.cursor()
                cursor.execute(f"LISTEN {NOTIFY_CHANNEL};")
                logger.info(f"[realtime] LISTEN on '{NOTIFY_CHANNEL}' established")
                backoff = INITIAL_BACKOFF

                while self.is_running:
                    if select.select([self._conn], [], [], 0.05) != ([], [], []):
                        self._conn.poll()
                        while self._conn.notifies:
                            notify = self._conn.notifies.pop(0)
                            await self._dispatch(notify.payload)
                    else:
                        await asyncio.sleep(0)
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

    async def _dispatch(self, payload_str: str) -> None:
        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError:
            logger.warning(f"[realtime] invalid notify payload: {payload_str!r}")
            return

        channel = payload.get("channel")
        event = payload.get("event")
        data = payload.get("payload")
        conversation_id = _parse_conversation_id(channel)
        if conversation_id is None or not event:
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

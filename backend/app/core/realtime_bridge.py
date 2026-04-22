import json
import logging
import asyncio
import socketio
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.core.config import settings

logger = logging.getLogger("app.realtime_bridge")
logger.setLevel(logging.INFO)

INITIAL_BACKOFF = 1
MAX_BACKOFF = 60
BACKOFF_FACTOR = 2


class RealtimeBridge:
    def __init__(self):
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=0,
            reconnection_delay=1,
            reconnection_delay_max=30,
        )
        self.pg_conn = None
        self.is_running = False
        self._listener_task = None
        self._ws_url = settings.INSFORGE_URL

    async def _relay_message(self, payload_str: str):
        try:
            logger.info(f"[RealtimeBridge] Received notification: {payload_str}")
            payload = json.loads(payload_str)
            channel = payload.get("channel")
            event = payload.get("event")
            data = payload.get("payload")

            if not all([channel, event]):
                logger.warning(f"Invalid payload received from DB: {payload_str}")
                return

            if self.sio.connected:
                await self.sio.emit(
                    "realtime:publish",
                    {"channel": channel, "event": event, "payload": data},
                )
                logger.info(
                    f"[RealtimeBridge] Relayed event '{event}' to channel '{channel}'"
                )
            else:
                logger.warning(
                    f"[RealtimeBridge] Discarded event '{event}' - InsForge WS disconnected"
                )

        except Exception as e:
            logger.error(f"Error relaying message: {e}")

    async def _listen_postgres(self):
        backoff = INITIAL_BACKOFF

        while self.is_running:
            try:
                dsn = settings.DATABASE_URL.replace(
                    "postgresql+psycopg2://", "postgresql://"
                )
                self.pg_conn = psycopg2.connect(dsn)
                self.pg_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

                cursor = self.pg_conn.cursor()
                cursor.execute("LISTEN insforge_realtime;")
                logger.info(
                    "[RealtimeBridge] Connected to Postgres and listening on 'insforge_realtime'"
                )

                backoff = INITIAL_BACKOFF

                import select

                while self.is_running:
                    if select.select([self.pg_conn], [], [], 0.5) == ([], [], []):
                        pass
                    else:
                        self.pg_conn.poll()
                        while self.pg_conn.notifies:
                            notify = self.pg_conn.notifies.pop(0)
                            await self._relay_message(notify.payload)

                    await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(
                    f"[RealtimeBridge] Postgres listener error: {e}. Retrying in {backoff}s..."
                )
                if self.pg_conn:
                    try:
                        self.pg_conn.close()
                    except Exception:
                        pass

                await asyncio.sleep(backoff)
                backoff = min(backoff * BACKOFF_FACTOR, MAX_BACKOFF)

    async def _manage_websocket(self):
        logger.info("[RealtimeBridge] WS manager started")
        ws_url = self._ws_url

        while self.is_running:
            if not self.sio.connected:
                try:
                    logger.info(
                        f"[RealtimeBridge] Connecting to InsForge at {ws_url}..."
                    )
                    auth = {"apiKey": settings.INSFORGE_API_KEY}

                    await self.sio.connect(
                        ws_url, auth=auth, wait_timeout=15, transports=["websocket"]
                    )
                    logger.info("[RealtimeBridge] Connected to InsForge Realtime")
                except Exception as e:
                    logger.error(f"[RealtimeBridge] InsForge WS connection failed: {e}")

            await asyncio.sleep(20)

    async def start(self):
        self.is_running = True
        logger.info("[RealtimeBridge] Starting background tasks...")
        self._listener_task = asyncio.create_task(self._listen_postgres())
        self._ws_task = asyncio.create_task(self._manage_websocket())

    async def stop(self):
        self.is_running = False
        logger.info("Stopping Realtime Bridge...")

        if self.pg_conn:
            self.pg_conn.close()

        if self.sio.connected:
            await self.sio.disconnect()

        if self._listener_task:
            self._listener_task.cancel()
        if self._ws_task:
            self._ws_task.cancel()


realtime_bridge = RealtimeBridge()

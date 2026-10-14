import asyncio
from contextlib import ExitStack
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from starlette.testclient import WebSocketDenialResponse

from app.core.exceptions.realtime import TooManySocketsError
from app.core.rate_limit import SlidingWindowLimiter
from app.core.realtime import (
    MAX_MESSAGE_BYTES,
    MAX_SOCKETS_PER_IP,
    MAX_SOCKETS_PER_USER,
    MAX_SUBSCRIPTIONS_PER_SOCKET,
    ConnectionManager,
)
from app.main import app
from app.routes import realtime as realtime_routes
from app.services.conversation_service import get_or_create_conversation

SUBPROTOCOLS = ["bearer", "good-token"]


@pytest.fixture
def ws_user(create_test_user, monkeypatch):
    user = create_test_user(email="ws@test.com", insforge_id="if_ws")

    async def fake_validate(token):
        if token != "good-token":
            return None
        return SimpleNamespace(user=SimpleNamespace(id="if_ws", email="ws@test.com"))

    monkeypatch.setattr(realtime_routes, "validate_insforge_token", fake_validate)
    return user


def _ws():
    """Transporte simulado: el ConnectionManager solo lo usa como clave/hash."""
    return object()


# --- ConnectionManager (unitario, transporte mockeado) ---


def test_user_socket_limit_is_enforced():
    async def scenario():
        manager = ConnectionManager()
        for _ in range(MAX_SOCKETS_PER_USER):
            await manager.register(_ws(), user_id=1, client_key="ip:1.1.1.1")
        with pytest.raises(TooManySocketsError):
            await manager.register(_ws(), user_id=1, client_key="ip:1.1.1.1")
        # Otro usuario desde la misma IP sigue por debajo del techo de IP
        await manager.register(_ws(), user_id=2, client_key="ip:1.1.1.1")

    asyncio.run(scenario())


def test_ip_socket_limit_is_enforced():
    async def scenario():
        manager = ConnectionManager()
        for uid in range(MAX_SOCKETS_PER_IP):
            await manager.register(_ws(), user_id=uid, client_key="ip:2.2.2.2")
        with pytest.raises(TooManySocketsError):
            await manager.register(_ws(), user_id=99, client_key="ip:2.2.2.2")
        # Otra IP no está afectada
        await manager.register(_ws(), user_id=99, client_key="ip:3.3.3.3")

    asyncio.run(scenario())


def test_disconnect_releases_the_user_slot():
    async def scenario():
        manager = ConnectionManager()
        first = _ws()
        await manager.register(first, user_id=1, client_key="ip:1.1.1.1")
        for _ in range(MAX_SOCKETS_PER_USER - 1):
            await manager.register(_ws(), user_id=1, client_key="ip:9.9.9.9")
        with pytest.raises(TooManySocketsError):
            await manager.register(_ws(), user_id=1, client_key="ip:8.8.8.8")

        await manager.disconnect(first)

        await manager.register(_ws(), user_id=1, client_key="ip:8.8.8.8")

    asyncio.run(scenario())


def test_disconnect_decrements_the_ip_counter():
    async def scenario():
        manager = ConnectionManager()
        sockets = [_ws() for _ in range(MAX_SOCKETS_PER_IP)]
        for index, ws in enumerate(sockets):
            await manager.register(ws, user_id=index, client_key="ip:1.1.1.1")
        with pytest.raises(TooManySocketsError):
            await manager.register(_ws(), user_id=500, client_key="ip:1.1.1.1")

        await manager.disconnect(sockets[0])

        await manager.register(_ws(), user_id=500, client_key="ip:1.1.1.1")

    asyncio.run(scenario())


def test_subscription_limit_per_socket():
    async def scenario():
        manager = ConnectionManager()
        ws = _ws()
        await manager.register(ws, user_id=1, client_key="ip:1.1.1.1")
        for conversation_id in range(MAX_SUBSCRIPTIONS_PER_SOCKET):
            assert await manager.subscribe(ws, conversation_id) is True
        assert await manager.subscribe(ws, 999) is False
        # Re-suscribirse a una conversación ya suscrita sigue permitido
        assert await manager.subscribe(ws, 0) is True

    asyncio.run(scenario())


# --- Rutas WebSocket (handshake real con TestClient) ---


def test_sixth_socket_for_the_same_user_is_denied_with_429(ws_user):
    client = TestClient(app)
    with ExitStack() as stack:
        for _ in range(MAX_SOCKETS_PER_USER):
            stack.enter_context(
                client.websocket_connect("/ws/realtime", subprotocols=SUBPROTOCOLS)
            )
        with pytest.raises(WebSocketDenialResponse) as exc:
            with client.websocket_connect("/ws/realtime", subprotocols=SUBPROTOCOLS):
                pass

    assert exc.value.status_code == 429


def test_sockets_are_capped_per_ip_across_users(monkeypatch):
    async def fake_validate(token):
        return SimpleNamespace(
            user=SimpleNamespace(id=f"if_{token}", email=f"{token}@test.com")
        )

    monkeypatch.setattr(realtime_routes, "validate_insforge_token", fake_validate)
    client = TestClient(app)
    with ExitStack() as stack:
        # Cada token es un usuario distinto: el techo que salta es el de IP
        for index in range(MAX_SOCKETS_PER_IP):
            stack.enter_context(
                client.websocket_connect(
                    "/ws/realtime", subprotocols=["bearer", f"user-{index}"]
                )
            )
        with pytest.raises(WebSocketDenialResponse) as exc:
            with client.websocket_connect(
                "/ws/realtime", subprotocols=["bearer", "user-late"]
            ):
                pass

    assert exc.value.status_code == 429


def test_subscription_limit_is_reported_as_error(db, ws_user, create_test_user):
    conversations = [
        get_or_create_conversation(
            db, ws_user.id, create_test_user(email=f"peer-{i}@test.com").id
        )
        for i in range(MAX_SUBSCRIPTIONS_PER_SOCKET + 1)
    ]

    with TestClient(app).websocket_connect(
        "/ws/realtime", subprotocols=SUBPROTOCOLS
    ) as ws:
        for conversation in conversations[:MAX_SUBSCRIPTIONS_PER_SOCKET]:
            ws.send_json({"action": "subscribe", "conversation_id": conversation.id})
            assert ws.receive_json() == {
                "event": "subscribed",
                "conversation_id": conversation.id,
            }
        ws.send_json(
            {
                "action": "subscribe",
                "conversation_id": conversations[MAX_SUBSCRIPTIONS_PER_SOCKET].id,
            }
        )
        response = ws.receive_json()

    assert response["error"] == "too_many_subscriptions"


def test_message_rate_overload_closes_with_1008(ws_user, monkeypatch):
    monkeypatch.setattr(realtime_routes, "ws_message_limiter", SlidingWindowLimiter(3))

    with TestClient(app).websocket_connect(
        "/ws/realtime", subprotocols=SUBPROTOCOLS
    ) as ws:
        for _ in range(3):
            ws.send_json({"action": "noop", "conversation_id": 1})
            assert ws.receive_json()["error"] == "unknown_action"
        ws.send_json({"action": "noop", "conversation_id": 1})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()

    assert exc.value.code == 1008


def test_oversized_message_closes_with_1009(ws_user):
    with TestClient(app).websocket_connect(
        "/ws/realtime", subprotocols=SUBPROTOCOLS
    ) as ws:
        ws.send_json(
            {"action": "noop", "conversation_id": 1, "pad": "a" * MAX_MESSAGE_BYTES}
        )
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()

    assert exc.value.code == 1009

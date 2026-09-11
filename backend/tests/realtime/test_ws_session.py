from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.db.database import engine
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


def test_open_socket_does_not_hold_a_pool_connection(db, ws_user, create_test_user):
    peer = create_test_user(email="peer@test.com")
    conversation = get_or_create_conversation(db, ws_user.id, peer.id)
    baseline = engine.pool.checkedout()

    with TestClient(app).websocket_connect(
        "/ws/realtime", subprotocols=SUBPROTOCOLS
    ) as ws:
        ws.send_json({"action": "subscribe", "conversation_id": conversation.id})
        assert ws.receive_json() == {
            "event": "subscribed",
            "conversation_id": conversation.id,
        }
        assert engine.pool.checkedout() == baseline


def test_subscribe_to_foreign_conversation_is_forbidden(db, ws_user, create_test_user):
    a = create_test_user(email="a@test.com")
    b = create_test_user(email="b@test.com")
    conversation = get_or_create_conversation(db, a.id, b.id)

    with TestClient(app).websocket_connect(
        "/ws/realtime", subprotocols=SUBPROTOCOLS
    ) as ws:
        ws.send_json({"action": "subscribe", "conversation_id": conversation.id})
        response = ws.receive_json()

    assert response["error"] == "forbidden"


def test_invalid_token_is_rejected(ws_user):
    with pytest.raises(WebSocketDisconnect) as exc:
        with TestClient(app).websocket_connect(
            "/ws/realtime", subprotocols=["bearer", "bad-token"]
        ) as ws:
            ws.receive_json()

    assert exc.value.code == 1008

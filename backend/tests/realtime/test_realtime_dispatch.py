import asyncio
import json
from unittest.mock import AsyncMock

import pytest

from app.core import realtime
from app.repositories import message_repository
from app.services.conversation_service import get_or_create_conversation


def _notify(event: str, payload: dict) -> str:
    return json.dumps({"channel": "conversation:7", "event": event, "payload": payload})


@pytest.fixture
def broadcast(monkeypatch):
    mock = AsyncMock()
    monkeypatch.setattr(realtime.manager, "broadcast", mock)
    return mock


def test_omitted_content_is_restored_before_broadcast(monkeypatch, broadcast):
    monkeypatch.setattr(realtime, "_load_message_content", lambda _id: "texto completo")
    payload = {"id": 12, "sender_id": 3, "sent_at": "t", "content_omitted": True}

    asyncio.run(realtime.listener._dispatch(_notify("new_message", payload)))

    broadcast.assert_awaited_once()
    conversation_id, message = broadcast.await_args.args
    assert conversation_id == 7
    assert message["payload"] == {
        "id": 12,
        "sender_id": 3,
        "sent_at": "t",
        "content": "texto completo",
    }


def test_omitted_content_for_missing_message_is_not_broadcast(monkeypatch, broadcast):
    monkeypatch.setattr(realtime, "_load_message_content", lambda _id: None)
    payload = {"id": 12, "content_omitted": True}

    asyncio.run(realtime.listener._dispatch(_notify("new_message", payload)))

    broadcast.assert_not_awaited()


def test_regular_payload_does_not_hit_the_database(monkeypatch, broadcast):
    def fail(_id):
        raise AssertionError("no debería consultar la BD")

    monkeypatch.setattr(realtime, "_load_message_content", fail)
    payload = {"id": 12, "content": "hola"}

    asyncio.run(realtime.listener._dispatch(_notify("new_message", payload)))

    assert broadcast.await_args.args[1]["payload"] == payload


def test_load_message_content_reads_from_database(db, create_test_user):
    sender = create_test_user(email="sender@test.com")
    other = create_test_user(email="receiver@test.com")
    conversation = get_or_create_conversation(db, sender.id, other.id)
    long_text = "😀" * 3000
    message = message_repository.create_message(
        db, conversation.id, sender.id, long_text
    )

    assert realtime._load_message_content(message.id) == long_text
    assert realtime._load_message_content(999999) is None
    assert realtime._load_message_content("12") is None

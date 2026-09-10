import pytest
from datetime import UTC, datetime, timedelta
from app.core.exceptions.user import UserNotFoundError
from app.models.message import Message
from app.services.conversation_service import (
    build_conversation_responses,
    create_or_get_conversation_with_status,
    get_or_create_conversation,
    send_message_with_status,
)


@pytest.fixture
def two_users(db, create_test_user):
    user1 = create_test_user(email="user1@test.com")
    user2 = create_test_user(email="user2@test.com")
    return user1, user2


def test_get_or_create_is_symmetric(db, two_users):
    """Crear con (user1, user2) y luego con (user2, user1) debe devolver la misma."""
    user1, user2 = two_users
    conv1 = get_or_create_conversation(db, user1.id, user2.id)
    conv2 = get_or_create_conversation(db, user2.id, user1.id)

    assert conv1.id == conv2.id


def test_get_or_create_rejects_unknown_user(db, two_users):
    user1, _ = two_users
    with pytest.raises(UserNotFoundError):
        get_or_create_conversation(db, user1.id, 999999)


def test_create_or_get_with_status_is_new_then_existing(db, two_users):
    user1, user2 = two_users
    conv1, was_new = create_or_get_conversation_with_status(db, user1.id, user2.id)
    assert was_new is True

    conv2, was_new = create_or_get_conversation_with_status(db, user2.id, user1.id)
    assert conv2.id == conv1.id
    assert was_new is False


def test_send_message_with_status_creates_conversation_and_flags_new(db, two_users):
    user1, user2 = two_users
    message, was_new = send_message_with_status(db, user1.id, user2.id, "hola")
    assert was_new is True
    assert message.sender_id == user1.id

    second, was_new_again = send_message_with_status(db, user1.id, user2.id, "de nuevo")
    assert was_new_again is False
    assert second.conversation_id == message.conversation_id


def test_build_conversation_responses_orders_by_last_activity(
    db, two_users, create_test_user
):
    user1, user2 = two_users
    conv_a, _ = create_or_get_conversation_with_status(db, user1.id, user2.id)

    user3 = create_test_user(email="user3@test.com")
    conv_b, _ = create_or_get_conversation_with_status(db, user1.id, user3.id)

    message = Message(
        conversation_id=conv_a.id,
        sender_id=user1.id,
        content="mensaje reciente",
        sent_at=datetime.now(UTC) + timedelta(minutes=5),
        is_read=False,
    )
    db.add(message)
    db.commit()

    responses = build_conversation_responses(db, [conv_a, conv_b], user1.id)
    assert [r.id for r in responses] == [conv_a.id, conv_b.id]
    assert responses[0].last_message is not None
    assert responses[1].last_message is None

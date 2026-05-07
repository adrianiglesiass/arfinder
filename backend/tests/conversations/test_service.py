import pytest
from app.services.conversation_service import (
    get_or_create_conversation,
    list_my_conversations,
    get_conversation_or_raise,
)
from app.core.exceptions.conversation import (
    CannotMessageYourselfError,
    ConversationNotFoundError,
    ConversationAccessDeniedError,
)


@pytest.fixture
def two_users(db, create_test_user):
    user1 = create_test_user(email="user1@test.com")
    user2 = create_test_user(email="user2@test.com")
    return user1, user2


def test_create_conversation(db, two_users):
    user1, user2 = two_users
    conv = get_or_create_conversation(db, user1.id, user2.id)

    assert conv.id is not None
    assert sorted([conv.user1_id, conv.user2_id]) == sorted([user1.id, user2.id])


def test_get_or_create_returns_existing(db, two_users):
    user1, user2 = two_users
    conv1 = get_or_create_conversation(db, user1.id, user2.id)
    conv2 = get_or_create_conversation(db, user1.id, user2.id)

    assert conv1.id == conv2.id


def test_get_or_create_is_symmetric(db, two_users):
    """Crear con (user1, user2) y luego con (user2, user1) debe devolver la misma."""
    user1, user2 = two_users
    conv1 = get_or_create_conversation(db, user1.id, user2.id)
    conv2 = get_or_create_conversation(db, user2.id, user1.id)

    assert conv1.id == conv2.id


def test_cannot_message_yourself(db, two_users):
    user1, _ = two_users
    with pytest.raises(CannotMessageYourselfError):
        get_or_create_conversation(db, user1.id, user1.id)


def test_list_my_conversations(db, two_users):
    user1, user2 = two_users
    get_or_create_conversation(db, user1.id, user2.id)
    convs = list_my_conversations(db, user1.id)

    assert len(convs) == 1


def test_list_conversations_only_mine(db, two_users, create_test_user):
    """Un usuario no ve conversaciones en las que no participa."""
    user1, user2 = two_users
    user3 = create_test_user(email="user3@test.com")
    get_or_create_conversation(db, user1.id, user2.id)
    get_or_create_conversation(db, user2.id, user3.id)

    convs = list_my_conversations(db, user3.id)
    assert len(convs) == 1
    convs_user1 = list_my_conversations(db, user1.id)
    assert len(convs_user1) == 1


def test_get_conversation_or_raise_not_found(db, two_users):
    user1, _ = two_users
    with pytest.raises(ConversationNotFoundError):
        get_conversation_or_raise(db, conversation_id=999, current_user_id=user1.id)


def test_get_conversation_or_raise_access_denied(db, two_users, create_test_user):
    user1, user2 = two_users
    user3 = create_test_user(email="user3@test.com")
    conv = get_or_create_conversation(db, user1.id, user2.id)

    with pytest.raises(ConversationAccessDeniedError):
        get_conversation_or_raise(db, conversation_id=conv.id, current_user_id=user3.id)

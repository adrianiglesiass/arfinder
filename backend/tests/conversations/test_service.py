import pytest
from app.services.conversation_service import get_or_create_conversation


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

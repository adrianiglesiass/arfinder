import pytest

from app.models.message import Message
from app.repositories import block_repository, profile_repository, user_repository
from app.schemas.profile import ProfileCreate, ScheduleEnum, TypeEnum
from app.services.conversation_service import get_or_create_conversation
from app.services.profile_service import create_profile

ME = "test@test.com"
OTHER = "other@test.com"
ME_HEADERS = {"Authorization": f"Bearer token_{ME}"}
OTHER_HEADERS = {"Authorization": f"Bearer token_{OTHER}"}


def _make_profile(db, user_id, name):
    return create_profile(
        db,
        user_id,
        ProfileCreate(
            name=name,
            age=30,
            city="Madrid",
            max_budget=800,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.afternoon,
            type=TypeEnum.looking_for_flat,
            gender="Mujer",
        ),
    )


@pytest.fixture
def me(client, db):
    return user_repository.get_user_by_email(db, ME)


@pytest.fixture
def other(db, create_test_user):
    user = create_test_user(email=OTHER)
    _make_profile(db, user.id, "Otra Persona")
    return user


@pytest.fixture
def conversation(db, me, other):
    return get_or_create_conversation(db, me.id, other.id)


def _count_messages(db, conversation_id):
    db.expire_all()
    return db.query(Message).filter(Message.conversation_id == conversation_id).count()


@pytest.mark.parametrize("sender_headers", [ME_HEADERS, OTHER_HEADERS])
def test_send_in_existing_conversation_is_rejected_in_both_directions(
    client, db, me, other, conversation, sender_headers
):
    block_repository.add(db, me.id, other.id)

    res = client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "hola"},
        headers=sender_headers,
    )

    assert res.status_code == 403
    assert res.json()["code"] == "MESSAGING_BLOCKED"
    assert _count_messages(db, conversation.id) == 0


@pytest.mark.parametrize(
    "sender_headers,recipient", [(ME_HEADERS, "other"), (OTHER_HEADERS, "me")]
)
def test_lazy_send_is_rejected_and_creates_nothing(
    client, db, request, me, other, sender_headers, recipient
):
    block_repository.add(db, other.id, me.id)
    recipient_id = request.getfixturevalue(recipient).id

    res = client.post(
        f"/conversations/with/{recipient_id}/messages",
        json={"content": "hola"},
        headers=sender_headers,
    )

    assert res.status_code == 403
    assert res.json()["code"] == "MESSAGING_BLOCKED"
    assert client.get("/conversations", headers=sender_headers).json() == []


def test_lazy_send_to_existing_conversation_is_rejected(
    client, db, me, other, conversation
):
    block_repository.add(db, me.id, other.id)

    res = client.post(
        f"/conversations/with/{other.id}/messages",
        json={"content": "hola"},
        headers=ME_HEADERS,
    )

    assert res.status_code == 403
    assert _count_messages(db, conversation.id) == 0


@pytest.mark.parametrize("blocker", ["me", "other"])
def test_create_new_conversation_is_rejected(client, db, request, me, other, blocker):
    blocker_user = request.getfixturevalue(blocker)
    blocked_user = other if blocker_user is me else me
    block_repository.add(db, blocker_user.id, blocked_user.id)

    res = client.post(
        "/conversations", json={"other_user_id": other.id}, headers=ME_HEADERS
    )

    assert res.status_code == 403
    assert res.json()["code"] == "MESSAGING_BLOCKED"


def test_existing_conversation_is_returned_read_only(
    client, db, me, other, conversation
):
    block_repository.add(db, other.id, me.id)

    res = client.post(
        "/conversations", json={"other_user_id": other.id}, headers=ME_HEADERS
    )

    assert res.status_code == 201
    assert res.json()["id"] == conversation.id
    assert res.json()["can_message"] is False


@pytest.mark.parametrize("viewer_headers", [ME_HEADERS, OTHER_HEADERS])
def test_history_stays_visible_and_flags_can_message(
    client, db, me, other, conversation, viewer_headers
):
    client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "antes del bloqueo"},
        headers=ME_HEADERS,
    )
    block_repository.add(db, me.id, other.id)

    listed = client.get("/conversations", headers=viewer_headers)
    detail = client.get(f"/conversations/{conversation.id}", headers=viewer_headers)
    history = client.get(
        f"/conversations/{conversation.id}/messages", headers=viewer_headers
    )
    read = client.patch(
        f"/conversations/{conversation.id}/read", headers=viewer_headers
    )

    assert listed.status_code == 200
    assert [c["can_message"] for c in listed.json()] == [False]
    assert detail.json()["can_message"] is False
    assert [m["content"] for m in history.json()] == ["antes del bloqueo"]
    assert read.status_code == 204


def test_can_message_is_true_without_block(client, conversation):
    res = client.get(f"/conversations/{conversation.id}", headers=ME_HEADERS)
    assert res.json()["can_message"] is True


def test_unblock_restores_messaging(client, db, me, other, conversation):
    other_profile_id = profile_repository.get_profile_by_user_id(db, other.id).id
    client.post(f"/profiles/{other_profile_id}/block", headers=ME_HEADERS)
    blocked = client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "hola"},
        headers=OTHER_HEADERS,
    )
    assert blocked.status_code == 403

    client.delete(f"/profiles/{other_profile_id}/block", headers=ME_HEADERS)

    sent = client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "hola"},
        headers=OTHER_HEADERS,
    )
    lazy = client.post(
        f"/conversations/with/{me.id}/messages",
        json={"content": "otra vez"},
        headers=OTHER_HEADERS,
    )
    detail = client.get(f"/conversations/{conversation.id}", headers=OTHER_HEADERS)

    assert sent.status_code == 201
    assert lazy.status_code == 201
    assert detail.json()["can_message"] is True


def test_unrelated_block_does_not_affect_conversation(
    client, db, me, other, conversation, create_test_user
):
    stranger = create_test_user(email="stranger@test.com")
    block_repository.add(db, me.id, stranger.id)

    res = client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "hola"},
        headers=OTHER_HEADERS,
    )

    assert res.status_code == 201


@pytest.mark.parametrize("blocker", ["me", "other"])
def test_is_conversation_blocked_detects_both_directions(
    db, request, me, other, conversation, blocker
):
    assert block_repository.is_conversation_blocked(db, conversation.id) is False

    blocker_user = request.getfixturevalue(blocker)
    blocked_user = other if blocker_user is me else me
    block_repository.add(db, blocker_user.id, blocked_user.id)

    assert block_repository.is_conversation_blocked(db, conversation.id) is True


def test_unblock_restores_creating_conversations(client, db, me, other):
    other_profile_id = profile_repository.get_profile_by_user_id(db, other.id).id
    client.post(f"/profiles/{other_profile_id}/block", headers=ME_HEADERS)
    body = {"other_user_id": other.id}
    assert (
        client.post("/conversations", json=body, headers=ME_HEADERS).status_code == 403
    )

    client.delete(f"/profiles/{other_profile_id}/block", headers=ME_HEADERS)

    created = client.post("/conversations", json=body, headers=ME_HEADERS)
    assert created.status_code == 201
    assert created.json()["can_message"] is True

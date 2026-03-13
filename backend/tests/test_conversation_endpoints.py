import pytest


@pytest.fixture
def second_user_headers(client):
    """Registra un segundo usuario y devuelve sus headers."""
    client.post(
        "/auth/register",
        json={"email": "other@test.com", "password": "password123"},
    )
    login = client.post(
        "/auth/login",
        json={"email": "other@test.com", "password": "password123"},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.fixture
def second_user_id(client):
    res = client.post(
        "/auth/register",
        json={"email": "other@test.com", "password": "password123"},
    )
    return res.json()["id"]


@pytest.fixture
def current_user_id(client, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    return res.json()["id"]


# ── POST /conversations ──────────────────────────────────────────────────────


def test_create_conversation_ok(client, auth_headers, second_user_id):
    res = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    assert res.status_code == 201
    assert res.json()["id"] is not None


def test_create_conversation_get_or_create(client, auth_headers, second_user_id):
    res1 = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    res2 = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    assert res1.json()["id"] == res2.json()["id"]


def test_create_conversation_with_yourself(client, auth_headers, current_user_id):
    res = client.post(
        "/conversations",
        json={"other_user_id": current_user_id},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_create_conversation_unauthorized(client, second_user_id):
    res = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
    )
    assert res.status_code == 401


# ── GET /conversations ───────────────────────────────────────────────────────


def test_list_conversations_empty(client, auth_headers):
    res = client.get("/conversations", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_list_conversations_returns_mine(client, auth_headers, second_user_id):
    client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    res = client.get("/conversations", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_list_conversations_last_message_null_when_no_messages(
    client, auth_headers, second_user_id
):
    client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    res = client.get("/conversations", headers=auth_headers)
    assert res.json()[0]["last_message"] is None


def test_list_conversations_unread_count_zero_initially(
    client, auth_headers, second_user_id
):
    client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    res = client.get("/conversations", headers=auth_headers)
    assert res.json()[0]["unread_count"] == 0


def test_list_conversations_unauthorized(client):
    res = client.get("/conversations")
    assert res.status_code == 401

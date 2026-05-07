import pytest


@pytest.fixture
def second_user_headers(create_test_user):
    """Crea un segundo usuario y devuelve sus headers con dummy token."""
    email = "other@test.com"
    create_test_user(email=email)
    return {"Authorization": f"Bearer token_{email}"}


@pytest.fixture
def second_user_id(create_test_user):
    user = create_test_user(email="other@test.com")
    return user.id


@pytest.fixture
def current_user_id(client, auth_headers):
    # This still works because /auth/me is mocked to return the default user or matching user
    res = client.get("/auth/me", headers=auth_headers)
    return res.json()["id"]


#  POST /conversations


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


#  GET /conversations


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


#  GET /conversations/{id}/messages


def test_list_messages_empty(client, auth_headers, second_user_id):
    res = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    conv_id = res.json()["id"]
    res = client.get(f"/conversations/{conv_id}/messages", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_list_messages_unauthorized(client, second_user_id):
    res = client.get("/conversations/1/messages")
    assert res.status_code == 401


def test_list_messages_conversation_not_found(client, auth_headers):
    res = client.get("/conversations/999/messages", headers=auth_headers)
    assert res.status_code == 404


def test_list_messages_pagination_default_returns_latest(
    client, auth_headers, second_user_id
):
    for i in range(60):
        client.post(
            f"/conversations/with/{second_user_id}/messages",
            json={"content": f"msg-{i}"},
            headers=auth_headers,
        )
    list_res = client.get("/conversations", headers=auth_headers)
    conv_id = list_res.json()[0]["id"]

    res = client.get(f"/conversations/{conv_id}/messages", headers=auth_headers)
    assert res.status_code == 200
    page = res.json()
    assert len(page) == 50
    assert page[0]["content"] == "msg-10"
    assert page[-1]["content"] == "msg-59"
    for a, b in zip(page, page[1:]):
        assert a["id"] < b["id"]


def test_list_messages_pagination_before_id_returns_older(
    client, auth_headers, second_user_id
):
    for i in range(60):
        client.post(
            f"/conversations/with/{second_user_id}/messages",
            json={"content": f"msg-{i}"},
            headers=auth_headers,
        )
    list_res = client.get("/conversations", headers=auth_headers)
    conv_id = list_res.json()[0]["id"]

    first_page = client.get(
        f"/conversations/{conv_id}/messages", headers=auth_headers
    ).json()
    cursor = first_page[0]["id"]

    older = client.get(
        f"/conversations/{conv_id}/messages",
        params={"before_id": cursor},
        headers=auth_headers,
    ).json()
    assert len(older) == 10
    assert older[0]["content"] == "msg-0"
    assert older[-1]["content"] == "msg-9"
    assert all(m["id"] < cursor for m in older)

    empty = client.get(
        f"/conversations/{conv_id}/messages",
        params={"before_id": older[0]["id"]},
        headers=auth_headers,
    ).json()
    assert empty == []


def test_list_messages_pagination_respects_limit(client, auth_headers, second_user_id):
    for i in range(10):
        client.post(
            f"/conversations/with/{second_user_id}/messages",
            json={"content": f"msg-{i}"},
            headers=auth_headers,
        )
    list_res = client.get("/conversations", headers=auth_headers)
    conv_id = list_res.json()[0]["id"]

    res = client.get(
        f"/conversations/{conv_id}/messages",
        params={"limit": 3},
        headers=auth_headers,
    )
    page = res.json()
    assert len(page) == 3
    assert page[0]["content"] == "msg-7"
    assert page[-1]["content"] == "msg-9"


def test_list_messages_access_denied(client, auth_headers, create_test_user):
    third_user = create_test_user(email="third@test.com")
    third_id = third_user.id

    second_headers = {"Authorization": "Bearer token_other@test.com"}
    create_test_user(email="other@test.com")

    res = client.post(
        "/conversations",
        json={"other_user_id": third_id},
        headers=second_headers,
    )
    conv_id = res.json()["id"]

    res = client.get(f"/conversations/{conv_id}/messages", headers=auth_headers)
    assert res.status_code == 403


#  PATCH /conversations/{id}/read


def test_mark_conversation_as_read_unauthorized(client):
    res = client.patch("/conversations/1/read")
    assert res.status_code == 401


def test_mark_conversation_as_read_not_found(client, auth_headers):
    res = client.patch("/conversations/999/read", headers=auth_headers)
    assert res.status_code == 404


def test_mark_conversation_as_read_ok(client, auth_headers, second_user_id):
    res = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    conv_id = res.json()["id"]
    res = client.patch(f"/conversations/{conv_id}/read", headers=auth_headers)
    assert res.status_code == 204


def test_get_conversation_ok(client, auth_headers, second_user_id):
    res = client.post(
        "/conversations",
        json={"other_user_id": second_user_id},
        headers=auth_headers,
    )
    conv_id = res.json()["id"]
    res = client.get(f"/conversations/{conv_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == conv_id


def test_get_conversation_not_found(client, auth_headers):
    res = client.get("/conversations/999", headers=auth_headers)
    assert res.status_code == 404


def test_get_conversation_access_denied(client, auth_headers, create_test_user):
    third_user = create_test_user(email="third@test.com")
    third_id = third_user.id

    create_test_user(email="other@test.com")
    second_headers = {"Authorization": "Bearer token_other@test.com"}
    res = client.post(
        "/conversations",
        json={"other_user_id": third_id},
        headers=second_headers,
    )
    conv_id = res.json()["id"]
    res = client.get(f"/conversations/{conv_id}", headers=auth_headers)
    assert res.status_code == 403


def test_get_conversation_unauthorized(client):
    res = client.get("/conversations/1")
    assert res.status_code == 401


#  POST /conversations/with/{recipient_user_id}/messages


def test_send_message_lazy_creates_conversation_and_message(
    client, auth_headers, second_user_id
):
    res = client.post(
        f"/conversations/with/{second_user_id}/messages",
        json={"content": "hi"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["content"] == "hi"
    assert body["sender_id"] != second_user_id
    assert isinstance(body["conversation_id"], int)

    list_res = client.get("/conversations", headers=auth_headers)
    assert list_res.status_code == 200
    convs = list_res.json()
    assert len(convs) == 1
    assert convs[0]["id"] == body["conversation_id"]


def test_send_message_lazy_reuses_existing_conversation(
    client, auth_headers, second_user_id
):
    first = client.post(
        f"/conversations/with/{second_user_id}/messages",
        json={"content": "first"},
        headers=auth_headers,
    )
    second = client.post(
        f"/conversations/with/{second_user_id}/messages",
        json={"content": "second"},
        headers=auth_headers,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["conversation_id"] == second.json()["conversation_id"]


def test_send_message_lazy_to_self_rejected(client, auth_headers, current_user_id):
    res = client.post(
        f"/conversations/with/{current_user_id}/messages",
        json={"content": "hi"},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_send_message_lazy_unauthorized(client, second_user_id):
    res = client.post(
        f"/conversations/with/{second_user_id}/messages",
        json={"content": "hi"},
    )
    assert res.status_code == 401

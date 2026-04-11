import pytest


@pytest.fixture
def two_users_tokens(create_test_user):
    create_test_user(email="user1@test.com")
    create_test_user(email="user2@test.com")

    return "token_user1@test.com", "token_user2@test.com"


@pytest.fixture
def conversation(client, two_users_tokens):
    token1, token2 = two_users_tokens
    headers1 = {"Authorization": f"Bearer {token1}"}

    user2_id = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token2}"}
    ).json()["id"]

    res = client.post(
        "/conversations",
        json={"other_user_id": user2_id},
        headers=headers1,
    )
    return res.json()["id"]


#   Conexi


def test_websocket_connect_authenticated(client, two_users_tokens, conversation):
    token1, _ = two_users_tokens
    with client.websocket_connect(
        f"/ws/conversations/{conversation}?token={token1}"
    ) as ws:
        assert ws is not None


def test_websocket_connect_no_token(client, conversation):
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/conversations/{conversation}"):
            pass


def test_websocket_connect_invalid_token(client, conversation):
    with pytest.raises(Exception):
        with client.websocket_connect(
            f"/ws/conversations/{conversation}?token=invalid"
        ):
            pass


def test_websocket_connect_not_participant(
    client, two_users_tokens, conversation, create_test_user
):

    create_test_user(email="outsider@test.com")
    outsider_token = "token_outsider@test.com"

    with pytest.raises(Exception):
        with client.websocket_connect(
            f"/ws/conversations/{conversation}?token={outsider_token}"
        ):
            pass


#  Envo y recepci


def test_websocket_send_message(client, two_users_tokens, conversation):
    token1, _ = two_users_tokens
    with client.websocket_connect(
        f"/ws/conversations/{conversation}?token={token1}"
    ) as ws:
        ws.send_json({"type": "message", "content": "Hola!"})
        data = ws.receive_json()
        assert data["type"] == "message"
        assert data["content"] == "Hola!"
        assert data["conversation_id"] == conversation


def test_websocket_message_has_id(client, two_users_tokens, conversation):
    token1, _ = two_users_tokens
    with client.websocket_connect(
        f"/ws/conversations/{conversation}?token={token1}"
    ) as ws:
        ws.send_json({"type": "message", "content": "Test"})
        data = ws.receive_json()
        assert data["id"] is not None


def test_websocket_empty_message_ignored(client, two_users_tokens, conversation):
    token1, _ = two_users_tokens
    with client.websocket_connect(
        f"/ws/conversations/{conversation}?token={token1}"
    ) as ws:
        ws.send_json({"type": "message", "content": ""})


#  Persistencia


def test_websocket_message_persisted(client, two_users_tokens, conversation):
    token1, token2 = two_users_tokens
    headers1 = {"Authorization": f"Bearer {token1}"}

    with client.websocket_connect(
        f"/ws/conversations/{conversation}?token={token1}"
    ) as ws:
        ws.send_json({"type": "message", "content": "Persistido"})
        ws.receive_json()

    res = client.get(f"/conversations/{conversation}/messages", headers=headers1)
    assert res.status_code == 200
    messages = res.json()
    assert len(messages) == 1
    assert messages[0]["content"] == "Persistido"


#  Desconexi


def test_websocket_disconnect_does_not_break_other_client(
    client, two_users_tokens, conversation
):
    token1, token2 = two_users_tokens

    with client.websocket_connect(
        f"/ws/conversations/{conversation}?token={token1}"
    ) as ws1:
        with client.websocket_connect(
            f"/ws/conversations/{conversation}?token={token2}"
        ) as ws2:
            ws1.send_json({"type": "message", "content": "Hola desde user1"})

            ws1.receive_json()

            data = ws2.receive_json()
            assert data["content"] == "Hola desde user1"

        ws1.send_json({"type": "message", "content": "Sigo aqu"})
        data = ws1.receive_json()
        assert data["content"] == "Sigo aqu"

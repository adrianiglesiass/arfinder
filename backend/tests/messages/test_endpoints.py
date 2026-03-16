def test_mark_message_as_read_returns_404(client, auth_headers):
    response = client.patch("/messages/999/read", headers=auth_headers)
    assert response.status_code == 404


def test_mark_message_as_read_unauthenticated_returns_401(client):
    response = client.patch("/messages/1/read")
    assert response.status_code == 401

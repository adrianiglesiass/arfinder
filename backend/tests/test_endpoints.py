def test_register_endpoint(client):
    response = client.post(
        "/auth/register", json={"email": "test@test.com", "password": "password123"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == "test@test.com"


def test_register_duplicate_returns_400(client):
    client.post(
        "/auth/register", json={"email": "test@test.com", "password": "password123"}
    )
    response = client.post(
        "/auth/register", json={"email": "test@test.com", "password": "password123"}
    )
    assert response.status_code == 400


def test_login_endpoint(client):
    client.post(
        "/auth/register", json={"email": "test@test.com", "password": "password123"}
    )
    response = client.post(
        "/auth/login", json={"email": "test@test.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_credentials_returns_401(client):
    response = client.post(
        "/auth/login", json={"email": "noexiste@test.com", "password": "password123"}
    )
    assert response.status_code == 401


def test_get_profile_me_unauthenticated_returns_401(client):
    response = client.get("/profiles/me")
    assert response.status_code == 401


def test_get_profile_me_authenticated_no_profile_returns_404(client, auth_headers):
    response = client.get("/profiles/me", headers=auth_headers)
    assert response.status_code == 404


def test_create_profile_authenticated(client, auth_headers):
    response = client.post(
        "/profiles/me",
        json={
            "name": "Test User",
            "age": 25,
            "city": "A Coruña",
            "type": "looking_for_flat",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test User"


def test_mark_message_as_read_returns_404(client, auth_headers):
    response = client.patch("/messages/999/read", headers=auth_headers)
    assert response.status_code == 404


def test_mark_message_as_read_unauthenticated_returns_401(client):
    response = client.patch("/messages/1/read")
    assert response.status_code == 401

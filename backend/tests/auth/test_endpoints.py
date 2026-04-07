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
    assert response.status_code == 409


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


def test_delete_account_ok(client, auth_headers):
    res = client.delete("/auth/me", headers=auth_headers)
    assert res.status_code == 204


def test_delete_account_unauthorized(client):
    res = client.delete("/auth/me")
    assert res.status_code == 401


def test_delete_account_token_invalid_after_deletion(client, auth_headers):
    client.delete("/auth/me", headers=auth_headers)
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 401

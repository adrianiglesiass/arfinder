def test_register_endpoint_returns_404(client):
    response = client.post(
        "/auth/register", json={"email": "test@test.com", "password": "Password123!"}
    )
    assert response.status_code == 404


def test_login_endpoint_returns_404(client):
    response = client.post(
        "/auth/login", json={"email": "test@test.com", "password": "Password123!"}
    )
    assert response.status_code == 404


def test_me_endpoint_unauthorized(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_delete_endpoint_unauthorized(client):
    res = client.delete("/auth/me")
    assert res.status_code == 401

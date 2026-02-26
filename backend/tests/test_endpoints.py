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


def test_get_profile_me_authenticated_no_profile_returns_404(client):
    client.post(
        "/auth/register", json={"email": "test@test.com", "password": "password123"}
    )
    login = client.post(
        "/auth/login", json={"email": "test@test.com", "password": "password123"}
    )
    token = login.json()["access_token"]

    response = client.get(
        "/profiles/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 404


def test_create_profile_authenticated(client):
    client.post(
        "/auth/register", json={"email": "test@test.com", "password": "password123"}
    )
    login = client.post(
        "/auth/login", json={"email": "test@test.com", "password": "password123"}
    )
    token = login.json()["access_token"]

    response = client.post(
        "/profiles/me",
        json={
            "nombre": "Test User",
            "edad": 25,
            "ciudad": "A Coruña",
            "tipo": "busco_piso",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["nombre"] == "Test User"

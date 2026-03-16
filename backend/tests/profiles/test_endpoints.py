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
            "city": "A Coru",
            "type": "looking_for_flat",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test User"

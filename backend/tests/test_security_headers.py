from app.core.config import settings


def test_security_headers_are_present(client, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "max-age=" in response.headers["strict-transport-security"]


def test_hsts_is_skipped_in_development(client, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    response = client.get("/health")

    assert "strict-transport-security" not in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"


def test_cors_preflight_still_works_with_security_headers(client):
    origin = settings.CORS_ORIGINS[0]

    response = client.options(
        "/auth/me",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["x-frame-options"] == "DENY"


def test_docs_are_still_served(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200

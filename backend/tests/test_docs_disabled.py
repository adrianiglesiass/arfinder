from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app as live_app
from app.main import create_app


def test_docs_and_openapi_are_disabled_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    client = TestClient(create_app())

    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404
    # El resto de rutas siguen respondiendo normalmente
    assert client.get("/health").status_code == 200


def test_docs_and_openapi_are_available_outside_production():
    # conftest fija ENVIRONMENT=testing
    client = TestClient(live_app)

    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    assert client.get("/openapi.json").status_code == 200

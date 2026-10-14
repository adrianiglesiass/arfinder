import pytest
from fastapi.testclient import TestClient

from app.core import dependencies
from app.main import app

INVALID_BEARER = {"Authorization": "Bearer bearer-invalido-abc123"}


@pytest.fixture
def real_auth_client(monkeypatch):
    """Cliente HTTP real: sin el override de `get_current_user` del conftest.

    InsForge queda mockeado para que toda validación de token falle, de modo que
    el camino completo (HTTP → dependencia de auth → handler de AppError) es el
    de producción.
    """

    async def fake_validate(_token):
        return None

    monkeypatch.setattr(dependencies, "validate_insforge_token", fake_validate)
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides.pop(dependencies.get_current_user, None)
    app.dependency_overrides.pop(dependencies.get_current_user_optional, None)

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)


def test_invalid_bearer_returns_401_on_a_protected_read_route(real_auth_client):
    res = real_auth_client.get("/auth/me", headers=INVALID_BEARER)

    assert res.status_code == 401
    assert res.json()["code"] == "INVALID_CREDENTIALS"


def test_missing_bearer_returns_401_on_a_protected_read_route(real_auth_client):
    res = real_auth_client.get("/auth/me")

    assert res.status_code == 401
    assert res.json()["code"] == "INVALID_CREDENTIALS"

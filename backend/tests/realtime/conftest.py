from types import SimpleNamespace

import pytest

from app.routes import realtime as realtime_routes


@pytest.fixture
def ws_user(create_test_user, monkeypatch):
    """Usuario local con InsForge mockeado para los tests de WebSocket."""
    user = create_test_user(email="ws@test.com", insforge_id="if_ws")

    async def fake_validate(token):
        if token != "good-token":
            return None
        return SimpleNamespace(user=SimpleNamespace(id="if_ws", email="ws@test.com"))

    monkeypatch.setattr(realtime_routes, "validate_insforge_token", fake_validate)
    return user

from hypothesis import given, strategies as st
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

from app.core.config import settings as app_settings
import pytest

app_settings.SECRET_KEY = "una_clave_totalmente_nueva_y_larga_para_los_tests_de_fuzzing"

client = TestClient(app)

test_token = create_access_token(user_id=99)
headers = {"Authorization": f"Bearer {test_token}"}


@given(email=st.emails(), password=st.text(min_size=0, max_size=100))
def test_register_fuzzing(email, password):
    response = client.post(
        "/auth/register", json={"email": email, "password": password}, headers=headers
    )

    if response.status_code == 500:
        pytest.fail(f"Fallo crítico 500 con password: {password}")

    assert response.status_code in [201, 422, 409]

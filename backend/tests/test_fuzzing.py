from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_public_routes_fuzzing():
    # Example of fuzzing a public route (if any exist without auth)
    response = client.get("/cities/search?q=test")
    assert response.status_code in [200, 422]

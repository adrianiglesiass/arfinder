import pytest
from unittest.mock import patch
from io import BytesIO


@pytest.fixture
def profile(db, client, auth_headers):
    client.post(
        "/profiles/me",
        json={
            "name": "Test User",
            "age": 25,
            "city": "A Coruña",
            "type": "looking_for_flat",
        },
        headers=auth_headers,
    )
    return True


@pytest.mark.asyncio
async def test_upload_profile_photo_success(client, auth_headers, db, profile):
    mock_upload_result = {
        "secure_url": "https://res.cloudinary.com/test/image/upload/v1/profiles/1/test.jpg"
    }

    with patch(
        "cloudinary.uploader.upload", return_value=mock_upload_result
    ) as mock_upload:
        file_content = b"fake image content"
        file = BytesIO(file_content)
        file.name = "test.jpg"

        response = client.post(
            "/profiles/me/photos",
            files={"file": ("test.jpg", file, "image/jpeg")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["photo_url"] == mock_upload_result["secure_url"]
        mock_upload.assert_called_once()


@pytest.mark.asyncio
async def test_upload_profile_photo_file_too_large(client, auth_headers, profile):
    large_content = b"0" * (11 * 1024 * 1024)
    file = BytesIO(large_content)

    response = client.post(
        "/profiles/me/photos",
        files={"file": ("large.jpg", file, "image/jpeg")},
        headers=auth_headers,
    )

    assert response.status_code == 413
    assert "File exceeds 10MB limit" in response.json()["detail"]


def test_list_profile_photos(client, auth_headers, profile, db):
    mock_upload_result = {
        "secure_url": "https://res.cloudinary.com/test/image/upload/v1/profiles/1/test.jpg"
    }

    with patch("cloudinary.uploader.upload", return_value=mock_upload_result):
        file_content = b"fake image content"
        file = BytesIO(file_content)
        client.post(
            "/profiles/me/photos",
            files={"file": ("test.jpg", file, "image/jpeg")},
            headers=auth_headers,
        )

    response = client.get("/profiles/me/photos", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert response.json()[0]["photo_url"] == mock_upload_result["secure_url"]


def test_delete_profile_photo(client, auth_headers, profile, db):
    mock_upload_result = {
        "secure_url": "https://res.cloudinary.com/test/image/upload/v1/profiles/1/test.jpg"
    }

    with patch("cloudinary.uploader.upload", return_value=mock_upload_result):
        file_content = b"fake image content"
        file = BytesIO(file_content)
        upload_res = client.post(
            "/profiles/me/photos",
            files={"file": ("test.jpg", file, "image/jpeg")},
            headers=auth_headers,
        )

    photo_id = upload_res.json()["id"]

    delete_res = client.delete(f"/profiles/me/photos/{photo_id}", headers=auth_headers)
    assert delete_res.status_code == 200

    list_res = client.get("/profiles/me/photos", headers=auth_headers)
    assert not any(p["id"] == photo_id for p in list_res.json())

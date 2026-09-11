import pytest

from app.core.exceptions.photo import PhotoLimitReachedError
from app.repositories import profile_photo_repository, user_repository
from app.schemas.profile import ProfileCreate, ScheduleEnum, TypeEnum
from app.services import profile_photo_service
from app.services.profile_service import create_profile

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


@pytest.fixture
def my_profile(db, client):
    me = user_repository.get_user_by_email(db, "test@test.com")
    return create_profile(
        db,
        me.id,
        ProfileCreate(
            name="Fotos",
            age=30,
            city="Madrid",
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.flexible,
            type=TypeEnum.looking_for_flat,
        ),
    )


def _fill(db, profile, count):
    for i in range(count):
        profile_photo_repository.create_profile_photo(
            db, profile.id, f"https://cdn/p{i}.jpg"
        )


def test_seventh_photo_is_rejected_before_uploading(
    client, db, auth_headers, my_profile, monkeypatch
):
    _fill(db, my_profile, profile_photo_service.MAX_PHOTOS_PER_PROFILE)
    uploads = []

    async def fake_upload(file, user_id):
        uploads.append(user_id)
        return "https://cdn/new.jpg"

    monkeypatch.setattr(profile_photo_service, "upload_image", fake_upload)

    res = client.post(
        "/profiles/me/photos",
        headers=auth_headers,
        files={"file": ("foto.png", PNG, "image/png")},
    )

    assert res.status_code == 409
    assert res.json()["code"] == "PHOTO_LIMIT_REACHED"
    assert uploads == []


def test_photo_below_the_limit_is_uploaded(
    client, db, auth_headers, my_profile, monkeypatch
):
    _fill(db, my_profile, profile_photo_service.MAX_PHOTOS_PER_PROFILE - 1)

    async def fake_upload(file, user_id):
        return "https://cdn/new.jpg"

    monkeypatch.setattr(profile_photo_service, "upload_image", fake_upload)

    res = client.post(
        "/profiles/me/photos",
        headers=auth_headers,
        files={"file": ("foto.png", PNG, "image/png")},
    )

    assert res.status_code == 200
    assert res.json()["photo_url"] == "https://cdn/new.jpg"


def test_locked_insert_enforces_the_limit(db, my_profile):
    _fill(db, my_profile, 2)

    with pytest.raises(PhotoLimitReachedError):
        profile_photo_repository.create_profile_photo(
            db, my_profile.id, "https://cdn/extra.jpg", max_photos=2
        )
    assert profile_photo_repository.count_photos(db, my_profile.id) == 2


def test_listing_photos_without_a_profile_returns_empty(client, auth_headers):
    res = client.get("/profiles/me/photos", headers=auth_headers)

    assert res.status_code == 200
    assert res.json() == []


def test_limit_hit_after_uploading_removes_the_orphan_image(
    client, db, auth_headers, my_profile, monkeypatch
):
    _fill(db, my_profile, profile_photo_service.MAX_PHOTOS_PER_PROFILE - 1)
    deleted = []

    async def upload_while_another_finishes(file, user_id):
        profile_photo_repository.create_profile_photo(
            db, my_profile.id, "https://cdn/concurrent.jpg"
        )
        return "https://cdn/orphan.jpg"

    monkeypatch.setattr(
        profile_photo_service, "upload_image", upload_while_another_finishes
    )
    monkeypatch.setattr(profile_photo_service, "delete_image", deleted.append)

    res = client.post(
        "/profiles/me/photos",
        headers=auth_headers,
        files={"file": ("foto.png", PNG, "image/png")},
    )

    assert res.status_code == 409
    assert deleted == ["https://cdn/orphan.jpg"]
    assert (
        profile_photo_repository.count_photos(db, my_profile.id)
        == profile_photo_service.MAX_PHOTOS_PER_PROFILE
    )

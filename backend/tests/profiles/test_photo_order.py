from app.repositories import profile_photo_repository
from app.schemas.profile import ProfileCreate, ScheduleEnum, TypeEnum
from app.services import profile_photo_service
from app.services.profile_service import create_profile

import pytest
from app.core.exceptions.photo import (
    PhotoOrderConflictError,
    PhotoReorderValidationError,
)

A = "https://cdn/a.jpg"
B = "https://cdn/b.jpg"
C = "https://cdn/c.jpg"


def _make_profile_with_reordered_photos(db, create_test_user):
    user = create_test_user(email="ordered@test.com")
    profile = create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Ordered",
            age=28,
            city="Sevilla",
            max_budget=600,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.flexible,
            type=TypeEnum.looking_for_flat,
            gender="Mujer",
        ),
    )

    p_a = profile_photo_repository.create_profile_photo(db, profile.id, A)
    p_b = profile_photo_repository.create_profile_photo(db, profile.id, B)
    p_c = profile_photo_repository.create_profile_photo(db, profile.id, C)

    # Reorder so `order` no longer matches insertion/id order: C, A, B
    profile_photo_repository.reorder_photos(db, profile.id, [p_c.id, p_a.id, p_b.id])

    return profile.id


def test_detail_and_summary_share_photo_order(client, db, create_test_user):
    profile_id = _make_profile_with_reordered_photos(db, create_test_user)

    detail = client.get(f"/profiles/{profile_id}")
    assert detail.status_code == 200
    detail_urls = [p["photo_url"] for p in detail.json()["photos"]]

    summary = client.get("/profiles")
    assert summary.status_code == 200
    match = next(p for p in summary.json() if p["id"] == profile_id)
    summary_urls = match["photo_urls"]

    assert detail_urls == [C, A, B]
    assert summary_urls == [C, A, B]
    assert detail_urls == summary_urls


def test_reorder_rejects_incomplete_ids(db, create_test_user):
    user = create_test_user(email="reorder2@test.com")
    profile = create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Reorder",
            age=28,
            city="Sevilla",
            max_budget=600,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.flexible,
            type=TypeEnum.looking_for_flat,
            gender="Mujer",
        ),
    )

    p_a = profile_photo_repository.create_profile_photo(db, profile.id, A)
    profile_photo_repository.create_profile_photo(db, profile.id, B)

    with pytest.raises(PhotoReorderValidationError):
        profile_photo_service.reorder(db, user.id, [p_a.id])


def test_update_photo_conflict_raises_409(db, create_test_user):
    user = create_test_user(email="reorder3@test.com")
    profile = create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Conflict",
            age=28,
            city="Sevilla",
            max_budget=600,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.flexible,
            type=TypeEnum.looking_for_flat,
            gender="Mujer",
        ),
    )

    p_a = profile_photo_repository.create_profile_photo(db, profile.id, A)
    p_b = profile_photo_repository.create_profile_photo(db, profile.id, B)

    with pytest.raises(PhotoOrderConflictError):
        profile_photo_service.update(db, user.id, p_b.id, order=p_a.order)

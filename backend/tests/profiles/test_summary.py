from datetime import datetime, timezone
from types import SimpleNamespace

from app.schemas.profile import ProfileResponse, TypeEnum
from app.services.profile_service import _profile_to_summary


def _photo(order, url):
    return SimpleNamespace(order=order, photo_url=url)


def _profile(photos):
    return SimpleNamespace(
        id=1,
        user_id=1,
        name="Test",
        age=30,
        city="Madrid",
        has_pets=False,
        is_smoker=False,
        type=TypeEnum.looking_for_flat,
        max_budget=700,
        schedule=None,
        gender=None,
        room_description=None,
        photos=photos,
    )


def test_summary_deduplicates_photo_urls_preserving_order():
    profile = _profile(
        [
            _photo(0, "https://cdn/a.jpg"),
            _photo(1, "https://cdn/a.jpg"),
            _photo(2, "https://cdn/b.jpg"),
        ]
    )

    summary = _profile_to_summary(profile)

    assert summary.photo_urls == ["https://cdn/a.jpg", "https://cdn/b.jpg"]


def _detail_photo(photo_id, order, url):
    return SimpleNamespace(
        id=photo_id,
        profile_id=1,
        photo_url=url,
        order=order,
        is_main=order == 0,
        created_at=datetime.now(timezone.utc),
    )


def test_detail_response_deduplicates_photos_preserving_order():
    profile = SimpleNamespace(
        id=1,
        user_id=1,
        name="Test",
        age=30,
        city="Madrid",
        bio=None,
        max_budget=700,
        has_pets=False,
        is_smoker=False,
        schedule=None,
        gender=None,
        available_from=None,
        type=TypeEnum.looking_for_flat,
        room_description=None,
        photos=[
            _detail_photo(1, 0, "https://cdn/a.jpg"),
            _detail_photo(2, 1, "https://cdn/a.jpg"),
            _detail_photo(3, 2, "https://cdn/b.jpg"),
        ],
    )

    response = ProfileResponse.model_validate(profile)

    assert [p.photo_url for p in response.photos] == [
        "https://cdn/a.jpg",
        "https://cdn/b.jpg",
    ]


def test_summary_deduplicates_non_consecutive_duplicates():
    profile = _profile(
        [
            _photo(0, "https://cdn/a.jpg"),
            _photo(1, "https://cdn/b.jpg"),
            _photo(2, "https://cdn/a.jpg"),
        ]
    )

    summary = _profile_to_summary(profile)

    assert summary.photo_urls == ["https://cdn/a.jpg", "https://cdn/b.jpg"]

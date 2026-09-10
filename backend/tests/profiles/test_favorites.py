import pytest
from app.services.profile_service import create_profile
from app.schemas.profile import ProfileCreate, TypeEnum, ScheduleEnum


@pytest.fixture
def other_profile(db, create_test_user):
    user = create_test_user(email="other@test.com")
    return create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Otra Persona",
            age=30,
            city="Madrid",
            max_budget=800,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.afternoon,
            type=TypeEnum.looking_for_flat,
            gender="Mujer",
        ),
    )


@pytest.fixture
def second_profile(db, create_test_user):
    user = create_test_user(email="second@test.com")
    return create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Segunda Persona",
            age=40,
            city="Barcelona",
            max_budget=900,
            has_pets=True,
            is_smoker=False,
            schedule=ScheduleEnum.night,
            type=TypeEnum.looking_for_roommate,
            gender="Hombre",
        ),
    )


def test_favorite_creates_and_lists(client, auth_headers, other_profile):
    res = client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    assert res.status_code == 204

    res = client.get("/profiles/me/favorites", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == other_profile.id


def test_favorite_duplicate_returns_409(client, auth_headers, other_profile):
    client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    res = client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    assert res.status_code == 409


def test_favorite_own_profile_returns_400(client, db, auth_headers, create_test_user):
    from app.repositories import user_repository

    me = user_repository.get_user_by_email(db, "test@test.com")
    my_profile = create_profile(
        db,
        me.id,
        ProfileCreate(
            name="Yo",
            age=28,
            city="Sevilla",
            max_budget=700,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.morning,
            type=TypeEnum.looking_for_flat,
            gender="Hombre",
        ),
    )

    res = client.post(f"/profiles/{my_profile.id}/favorite", headers=auth_headers)
    assert res.status_code == 400


def test_favorite_unknown_profile_returns_404(client, auth_headers):
    res = client.post("/profiles/999999/favorite", headers=auth_headers)
    assert res.status_code == 404


def test_unfavorite_is_idempotent(client, auth_headers, other_profile):
    client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    res = client.delete(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    assert res.status_code == 204

    res = client.get("/profiles/me/favorites", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []

    res = client.delete(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    assert res.status_code == 204


def test_favorites_required_auth(client, other_profile):
    res = client.get("/profiles/me/favorites")
    assert res.status_code == 401

    res = client.post(f"/profiles/{other_profile.id}/favorite")
    assert res.status_code == 401


def test_favorites_ordered_most_recent_first(
    client, auth_headers, other_profile, second_profile
):
    client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    client.post(f"/profiles/{second_profile.id}/favorite", headers=auth_headers)

    res = client.get("/profiles/me/favorites", headers=auth_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [second_profile.id, other_profile.id]

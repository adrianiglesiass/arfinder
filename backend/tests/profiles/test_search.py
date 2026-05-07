import pytest
from app.services.profile_service import create_profile
from app.schemas.profile import ProfileCreate, TypeEnum, ScheduleEnum


@pytest.fixture
def profile_madrid(db, create_test_user):
    user = create_test_user(email="madrid@test.com")
    return create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Ana Madrid",
            age=25,
            city="Madrid",
            max_budget=700,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.morning,
            type=TypeEnum.looking_for_flat,
            gender="Mujer",
        ),
    )


@pytest.fixture
def profile_barcelona(db, create_test_user):
    user = create_test_user(email="barcelona@test.com")
    return create_profile(
        db,
        user.id,
        ProfileCreate(
            name="Carlos Barcelona",
            age=35,
            city="Barcelona",
            max_budget=1000,
            has_pets=True,
            is_smoker=True,
            schedule=ScheduleEnum.night,
            type=TypeEnum.looking_for_roommate,
            gender="Hombre",
        ),
    )


def test_search_no_filters_returns_all(
    client, auth_headers, profile_madrid, profile_barcelona
):
    res = client.get("/profiles", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_search_by_city(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?city=Madrid", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["city"] == "Madrid"


def test_search_by_city_partial(
    client, auth_headers, profile_madrid, profile_barcelona
):
    res = client.get("/profiles?city=mad", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_search_by_budget_max(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?budget_max=700", headers=auth_headers)
    assert res.status_code == 200
    assert all(p["max_budget"] <= 700 for p in res.json())


def test_search_by_has_pets(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?has_pets=false", headers=auth_headers)
    assert res.status_code == 200
    assert all(not p["has_pets"] for p in res.json())


def test_search_by_is_smoker(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?is_smoker=false", headers=auth_headers)
    assert res.status_code == 200
    assert all(not p["is_smoker"] for p in res.json())


def test_search_by_schedule(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?schedule=morning", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["schedule"] == "morning"


def test_search_by_profile_type(
    client, auth_headers, profile_madrid, profile_barcelona
):
    res = client.get("/profiles?profile_type=looking_for_flat", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["type"] == "looking_for_flat"


def test_search_by_age_range(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?age_min=30&age_max=40", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["age"] == 35


def test_search_by_gender(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?gender=Mujer", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["gender"] == "Mujer"


def test_search_combined_filters(
    client, auth_headers, profile_madrid, profile_barcelona
):
    res = client.get(
        "/profiles?city=Madrid&budget_max=700&is_smoker=false", headers=auth_headers
    )
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["city"] == "Madrid"


def test_search_no_results(client, auth_headers, profile_madrid, profile_barcelona):
    res = client.get("/profiles?city=Tokio", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_search_anonymous_returns_all(client, profile_madrid, profile_barcelona):
    # Endpoint es opcional-auth: sin token devuelve todos los perfiles sin filtrar.
    res = client.get("/profiles")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_search_excludes_own_profile(client, db, profile_barcelona):
    # The default authenticated user (test@test.com) creates their own profile.
    from app.repositories import user_repository

    me = user_repository.get_user_by_email(db, "test@test.com")
    create_profile(
        db,
        me.id,
        ProfileCreate(
            name="Yo Mismo",
            age=30,
            city="Sevilla",
            max_budget=600,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.afternoon,
            type=TypeEnum.looking_for_flat,
            gender="Hombre",
        ),
    )

    res = client.get(
        "/profiles", headers={"Authorization": "Bearer token_test@test.com"}
    )
    assert res.status_code == 200
    body = res.json()
    user_ids = [p["user_id"] for p in body]
    assert me.id not in user_ids
    assert profile_barcelona.user_id in user_ids
    assert len(body) == 1


def test_get_public_profile_ok(client, profile_madrid):
    res = client.get(f"/profiles/{profile_madrid.id}")
    assert res.status_code == 200
    assert res.json()["id"] == profile_madrid.id
    assert res.json()["city"] == "Madrid"


def test_get_public_profile_not_found(client):
    res = client.get("/profiles/999")
    assert res.status_code == 404


def test_get_public_profile_no_auth_required(client, profile_madrid):
    res = client.get(f"/profiles/{profile_madrid.id}")
    assert res.status_code == 200

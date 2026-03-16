import pytest
from app.services.auth_service import register_user
from app.services.profile_service import create_profile
from app.schemas.user import UserCreate
from app.schemas.profile import ProfileCreate, TypeEnum, ScheduleEnum


@pytest.fixture
def profile_madrid(db):
    user = register_user(
        db, UserCreate(email="madrid@test.com", password="password123")
    )
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
def profile_barcelona(db):
    user = register_user(
        db, UserCreate(email="barcelona@test.com", password="password123")
    )
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


def test_search_no_filters_returns_all(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_search_by_city(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?city=Madrid")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["city"] == "Madrid"


def test_search_by_city_partial(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?city=mad")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_search_by_budget_max(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?budget_max=700")
    assert res.status_code == 200
    assert all(p["max_budget"] <= 700 for p in res.json())


def test_search_by_has_pets(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?has_pets=false")
    assert res.status_code == 200
    assert all(not p["has_pets"] for p in res.json())


def test_search_by_is_smoker(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?is_smoker=false")
    assert res.status_code == 200
    assert all(not p["is_smoker"] for p in res.json())


def test_search_by_schedule(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?schedule=morning")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["schedule"] == "morning"


def test_search_by_profile_type(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?profile_type=looking_for_flat")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["type"] == "looking_for_flat"


def test_search_by_age_range(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?age_min=30&age_max=40")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["age"] == 35


def test_search_by_gender(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?gender=Mujer")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["gender"] == "Mujer"


def test_search_combined_filters(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?city=Madrid&budget_max=700&is_smoker=false")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["city"] == "Madrid"


def test_search_no_results(client, profile_madrid, profile_barcelona):
    res = client.get("/profiles?city=Tokio")
    assert res.status_code == 200
    assert res.json() == []


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

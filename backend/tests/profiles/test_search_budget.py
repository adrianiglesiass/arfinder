import pytest

from app.schemas.profile import ProfileCreate, TypeEnum
from app.services.profile_service import create_profile


@pytest.fixture
def make_profile(db, create_test_user):
    def _make(name, amount, profile_type, city="Madrid"):
        user = create_test_user(email=f"{name.lower()}@test.com")
        return create_profile(
            db,
            user.id,
            ProfileCreate(
                name=name,
                age=30,
                city=city,
                max_budget=amount,
                type=profile_type,
            ),
        )

    return _make


@pytest.fixture
def seekers(make_profile):
    """People looking for a flat: `max_budget` is what they can pay."""
    return {
        "low": make_profile("Low", 500, TypeEnum.looking_for_flat),
        "equal": make_profile("Equal", 600, TypeEnum.looking_for_flat),
        "high": make_profile("High", 900, TypeEnum.looking_for_flat),
    }


@pytest.fixture
def rooms(make_profile):
    """People offering a room: `max_budget` is the room price."""
    return {
        "cheap": make_profile("Cheap", 500, TypeEnum.looking_for_roommate),
        "equal_room": make_profile("Same", 600, TypeEnum.looking_for_roommate),
        "pricey": make_profile("Pricey", 900, TypeEnum.looking_for_roommate),
    }


def _names(res):
    assert res.status_code == 200
    return {p["name"] for p in res.json()}


def test_budget_min_finds_seekers_who_can_pay_the_room_price(
    client, auth_headers, seekers
):
    res = client.get(
        "/profiles?budget_min=600&profile_type=looking_for_flat", headers=auth_headers
    )
    assert _names(res) == {"Equal", "High"}


def test_budget_max_finds_rooms_within_the_seeker_budget(client, auth_headers, rooms):
    res = client.get(
        "/profiles?budget_max=600&profile_type=looking_for_roommate",
        headers=auth_headers,
    )
    assert _names(res) == {"Cheap", "Same"}


def test_budget_min_and_max_are_independent_bounds(
    client, auth_headers, seekers, rooms
):
    res = client.get("/profiles?budget_min=600&budget_max=600", headers=auth_headers)
    assert _names(res) == {"Equal", "Same"}


def test_profiles_without_amount_are_excluded_only_when_filtering(
    client, auth_headers, make_profile, seekers
):
    make_profile("Unknown", None, TypeEnum.looking_for_flat)

    assert "Unknown" in _names(client.get("/profiles", headers=auth_headers))
    assert "Unknown" not in _names(
        client.get("/profiles?budget_min=200", headers=auth_headers)
    )
    assert "Unknown" not in _names(
        client.get("/profiles?budget_max=1500", headers=auth_headers)
    )


def test_budget_min_combines_with_type_and_city(
    client, auth_headers, make_profile, seekers, rooms
):
    make_profile("Remote", 900, TypeEnum.looking_for_flat, city="Sevilla")

    res = client.get(
        "/profiles?budget_min=600&profile_type=looking_for_flat&city=Madrid",
        headers=auth_headers,
    )
    assert _names(res) == {"Equal", "High"}


def test_budget_min_rejects_non_numeric_values(client, auth_headers):
    res = client.get("/profiles?budget_min=abc", headers=auth_headers)
    assert res.status_code == 422

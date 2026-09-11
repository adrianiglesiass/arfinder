import pytest
from app.services.profile_service import create_profile
from app.schemas.profile import ProfileCreate, TypeEnum, ScheduleEnum


def _make_profile(db, user_id, name, city, gender="Mujer"):
    return create_profile(
        db,
        user_id,
        ProfileCreate(
            name=name,
            age=30,
            city=city,
            max_budget=800,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.afternoon,
            type=TypeEnum.looking_for_flat,
            gender=gender,
        ),
    )


@pytest.fixture
def other_profile(db, create_test_user):
    user = create_test_user(email="other@test.com")
    return _make_profile(db, user.id, "Otra Persona", "Madrid")


@pytest.fixture
def second_profile(db, create_test_user):
    user = create_test_user(email="second@test.com")
    return _make_profile(db, user.id, "Segunda Persona", "Barcelona")


def test_block_creates_and_lists(client, auth_headers, other_profile):
    res = client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    assert res.status_code == 204

    res = client.get("/profiles/me/blocked", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == other_profile.id


def test_block_duplicate_returns_409(client, auth_headers, other_profile):
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    res = client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    assert res.status_code == 409


def test_block_own_profile_returns_400(client, db, auth_headers):
    from app.repositories import user_repository

    me = user_repository.get_user_by_email(db, "test@test.com")
    my_profile = _make_profile(db, me.id, "Yo", "Sevilla")
    res = client.post(f"/profiles/{my_profile.id}/block", headers=auth_headers)
    assert res.status_code == 400


def test_block_unknown_profile_returns_404(client, auth_headers):
    res = client.post("/profiles/999999/block", headers=auth_headers)
    assert res.status_code == 404


def test_unblock_is_idempotent(client, auth_headers, other_profile):
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)

    res = client.delete(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    assert res.status_code == 204

    res = client.get("/profiles/me/blocked", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []

    res = client.delete(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    assert res.status_code == 204


def test_blocked_required_auth(client, other_profile):
    res = client.get("/profiles/me/blocked")
    assert res.status_code == 401

    res = client.post(f"/profiles/{other_profile.id}/block")
    assert res.status_code == 401


def test_blocked_ordered_most_recent_first(
    client, auth_headers, other_profile, second_profile
):
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    client.post(f"/profiles/{second_profile.id}/block", headers=auth_headers)

    res = client.get("/profiles/me/blocked", headers=auth_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [second_profile.id, other_profile.id]


def test_search_excludes_blocked_in_both_directions(
    client, db, auth_headers, other_profile, second_profile, create_test_user
):
    from app.repositories import user_repository

    me = user_repository.get_user_by_email(db, "test@test.com")
    _make_profile(db, me.id, "Yo Mismo", "Sevilla")

    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)

    blocked_headers = {"Authorization": "Bearer token_other@test.com"}

    res = client.get("/profiles", headers=auth_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [second_profile.id]

    res = client.get("/profiles", headers=blocked_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [second_profile.id]


def test_search_anonymous_still_sees_blocked(client, other_profile, auth_headers):
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    res = client.get("/profiles")
    assert res.status_code == 200
    assert any(p["id"] == other_profile.id for p in res.json())


def test_favorites_exclude_blocked_profiles(
    client, auth_headers, other_profile, second_profile
):
    client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    client.post(f"/profiles/{second_profile.id}/favorite", headers=auth_headers)

    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)

    res = client.get("/profiles/me/favorites", headers=auth_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [second_profile.id]


def test_blocked_favorite_persists_and_returns_after_unblock(
    client, auth_headers, other_profile
):
    client.post(f"/profiles/{other_profile.id}/favorite", headers=auth_headers)
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)

    res = client.get("/profiles/me/favorites", headers=auth_headers)
    assert res.json() == []

    client.delete(f"/profiles/{other_profile.id}/block", headers=auth_headers)

    res = client.get("/profiles/me/favorites", headers=auth_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [other_profile.id]


def test_block_error_codes(client, db, auth_headers, other_profile):
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    res = client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)
    assert res.json()["code"] == "USER_BLOCK_ALREADY_EXISTS"

    from app.repositories import user_repository

    me = user_repository.get_user_by_email(db, "test@test.com")
    my_profile = _make_profile(db, me.id, "Yo", "Sevilla")
    res = client.post(f"/profiles/{my_profile.id}/block", headers=auth_headers)
    assert res.json()["code"] == "CANNOT_BLOCK_SELF"


def test_exclusion_is_not_capped_at_200_blocks(db, create_test_user):
    from app.models.block import UserBlock
    from app.services import block_service

    target = create_test_user(email="target@test.com")
    blockers = [create_test_user(email=f"blocker{i}@test.com") for i in range(201)]
    db.add_all(
        UserBlock(blocker_user_id=b.id, blocked_user_id=target.id) for b in blockers
    )
    db.commit()

    excluded = block_service.excluded_user_ids(db, target.id)

    assert len(excluded) == 201
    assert {b.id for b in blockers} == set(excluded)


def test_blocked_listing_keeps_its_limit(db, create_test_user):
    from app.models.block import UserBlock
    from app.repositories import block_repository

    blocker = create_test_user(email="many@test.com")
    targets = [create_test_user(email=f"t{i}@test.com") for i in range(201)]
    db.add_all(
        UserBlock(blocker_user_id=blocker.id, blocked_user_id=t.id) for t in targets
    )
    db.commit()

    assert len(block_repository.list_blocked_user_ids(db, blocker.id)) == 200

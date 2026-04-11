import pytest
from app.services.profile_service import get_profile, create_profile, update_profile
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.core.exceptions.profile import ProfileNotFoundError, ProfileAlreadyExistsError


@pytest.fixture
def user(db, create_test_user):
    return create_test_user(email="test@test.com")


@pytest.fixture
def profile_data():
    return ProfileCreate(
        name="Test User", age=25, city="A Coruña", type="looking_for_flat"
    )


def test_create_profile(db, user, profile_data):
    profile = create_profile(db, user.id, profile_data)
    assert profile.id is not None
    assert profile.user_id == user.id
    assert profile.name == "Test User"


def test_create_duplicate_profile_raises_exception(db, user, profile_data):
    create_profile(db, user.id, profile_data)
    with pytest.raises(ProfileAlreadyExistsError):
        create_profile(db, user.id, profile_data)


def test_get_profile(db, user, profile_data):
    create_profile(db, user.id, profile_data)
    profile = get_profile(db, user.id)
    assert profile.user_id == user.id


def test_get_nonexistent_profile_raises_exception(db, user):
    with pytest.raises(ProfileNotFoundError):
        get_profile(db, user.id)


def test_update_profile(db, user, profile_data):
    create_profile(db, user.id, profile_data)
    updated = update_profile(db, user.id, ProfileUpdate(name="New Name"))
    assert updated.name == "New Name"


def test_update_nonexistent_profile_raises_exception(db, user):
    with pytest.raises(ProfileNotFoundError):
        update_profile(db, user.id, ProfileUpdate(name="New Name"))

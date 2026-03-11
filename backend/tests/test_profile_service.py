import pytest
from app.services.auth_service import register_user
from app.services.profile_service import ProfileService
from app.schemas.user import UserCreate
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.core.exceptions.profile import ProfileNotFoundError, ProfileAlreadyExistsError


@pytest.fixture
def user(db):
    return register_user(db, UserCreate(email="test@test.com", password="password123"))


@pytest.fixture
def profile_data():
    return ProfileCreate(
        nombre="Test User", edad=25, ciudad="A Coruña", tipo="busco_piso"
    )


def test_create_profile(db, user, profile_data):
    profile = ProfileService.create_profile(db, user.id, profile_data)
    assert profile.id is not None
    assert profile.user_id == user.id
    assert profile.nombre == "Test User"


def test_create_duplicate_profile_raises_exception(db, user, profile_data):
    ProfileService.create_profile(db, user.id, profile_data)
    with pytest.raises(ProfileAlreadyExistsError):
        ProfileService.create_profile(db, user.id, profile_data)


def test_get_profile(db, user, profile_data):
    ProfileService.create_profile(db, user.id, profile_data)
    profile = ProfileService.get_profile(db, user.id)

    assert profile.user_id == user.id


def test_get_nonexistent_profile_raises_exception(db, user):
    with pytest.raises(ProfileNotFoundError):
        ProfileService.get_profile(db, user.id)


def test_update_profile(db, user, profile_data):
    ProfileService.create_profile(db, user.id, profile_data)
    updated = ProfileService.update_profile(
        db, user.id, ProfileUpdate(nombre="Nuevo Nombre")
    )

    assert updated.nombre == "Nuevo Nombre"


def test_update_nonexistent_profile_raises_exception(db, user):
    with pytest.raises(ProfileNotFoundError):
        ProfileService.update_profile(
            db, user.id, ProfileUpdate(nombre="Nuevo Nombre"))

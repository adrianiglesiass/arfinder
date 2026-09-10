from app.core.auth_utils import get_or_create_local_user
from app.models.user import User
from app.repositories import profile_repository
from app.schemas.profile import ProfileCreate, ScheduleEnum, TypeEnum
from app.services.profile_service import create_profile
from unittest.mock import MagicMock


def test_get_or_create_local_user_provisions_new_user(db):
    # Mock InsForge user
    insforge_user = MagicMock()
    insforge_user.id = "if_mock_123"
    insforge_user.email = "new_user@test.com"

    user = get_or_create_local_user(db, insforge_user)

    assert user.id is not None
    assert user.email == "new_user@test.com"
    assert user.insforge_id == "if_mock_123"


def test_get_or_create_local_user_finds_existing_by_id(db):
    # Setup existing user
    existing = User(email="existing@test.com", insforge_id="if_existing")
    db.add(existing)
    db.commit()

    insforge_user = MagicMock()
    insforge_user.id = "if_existing"
    insforge_user.email = "existing@test.com"

    user = get_or_create_local_user(db, insforge_user)

    assert user.id == existing.id


def test_get_or_create_local_user_links_existing_by_email(db):
    # Setup user with email but no insforge_id
    existing = User(email="only_email@test.com", insforge_id=None)
    db.add(existing)
    db.commit()

    insforge_user = MagicMock()
    insforge_user.id = "if_newly_linked"
    insforge_user.email = "only_email@test.com"

    user = get_or_create_local_user(db, insforge_user)

    assert user.id == existing.id
    assert user.insforge_id == "if_newly_linked"


def test_email_takeover_keeps_profile(db, create_test_user):
    # Profile exists for email; a different InsForge account claims the email.
    existing = create_test_user(email="takeover@test.com", insforge_id="if_old")
    profile = create_profile(
        db,
        existing.id,
        ProfileCreate(
            name="Takeover",
            age=30,
            city="Madrid",
            max_budget=800,
            has_pets=False,
            is_smoker=False,
            schedule=ScheduleEnum.flexible,
            type=TypeEnum.looking_for_flat,
            gender="Hombre",
        ),
    )

    insforge_user = MagicMock()
    insforge_user.id = "if_new_owner"
    insforge_user.email = "takeover@test.com"

    user = get_or_create_local_user(db, insforge_user)

    assert user.id == existing.id
    assert user.insforge_id == "if_new_owner"
    assert profile_repository.get_profile_by_user_id(db, existing.id) is not None
    assert profile_repository.get_profile_by_user_id(db, existing.id).id == profile.id

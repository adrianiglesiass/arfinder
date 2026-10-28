from datetime import datetime, timezone

import pytest

from app.core.constants import CURRENT_TERMS_VERSION
from app.core.exceptions.auth import TermsNotAcceptedError
from app.repositories import user_repository
from app.schemas.profile import ProfileCreate, TypeEnum
from app.services.profile_service import create_profile

PROFILE_PAYLOAD = {
    "name": "Nueva Persona",
    "age": 27,
    "city": "Valencia",
    "type": "looking_for_flat",
}


def _profile_data() -> ProfileCreate:
    return ProfileCreate(**{**PROFILE_PAYLOAD, "type": TypeEnum.looking_for_flat})


def test_create_profile_without_consent_raises(db, create_test_user):
    user = create_test_user(email="no_consent@test.com", accepted_terms=False)

    with pytest.raises(TermsNotAcceptedError):
        create_profile(db, user.id, _profile_data())


def test_create_profile_with_outdated_consent_raises(db, create_test_user):
    user = create_test_user(email="outdated@test.com", accepted_terms=False)
    user_repository.update_terms_consent(db, user, datetime.now(timezone.utc), "0.0.1")

    with pytest.raises(TermsNotAcceptedError):
        create_profile(db, user.id, _profile_data())


def test_create_profile_with_current_consent_succeeds(db, create_test_user):
    user = create_test_user(email="consented@test.com", accepted_terms=True)

    profile = create_profile(db, user.id, _profile_data())

    assert profile.user_id == user.id


def test_create_my_profile_without_consent_returns_403(client, no_consent_headers):
    response = client.post(
        "/profiles/me", json=PROFILE_PAYLOAD, headers=no_consent_headers
    )

    assert response.status_code == 403
    assert response.json()["code"] == "TERMS_NOT_ACCEPTED"


def test_create_my_profile_after_consent_succeeds(client, auth_headers):
    consent = client.post(
        "/auth/me/consent",
        json={"terms_version": CURRENT_TERMS_VERSION, "is_adult": True},
        headers=auth_headers,
    )
    assert consent.status_code == 200

    response = client.post("/profiles/me", json=PROFILE_PAYLOAD, headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["name"] == PROFILE_PAYLOAD["name"]

from datetime import datetime, timedelta, timezone

from app.core.constants import CURRENT_TERMS_VERSION
from app.models.user import User
from app.repositories import user_repository

CONSENT_URL = "/auth/me/consent"
VALID_BODY = {"terms_version": CURRENT_TERMS_VERSION, "is_adult": True}


def _parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def test_accept_terms_records_version_and_timestamp(client, auth_headers, db):
    before = datetime.now(timezone.utc) - timedelta(seconds=5)

    response = client.post(CONSENT_URL, json=VALID_BODY, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["terms_version"] == CURRENT_TERMS_VERSION
    accepted_at = _parse_utc(body["terms_accepted_at"])
    assert before <= accepted_at <= datetime.now(timezone.utc) + timedelta(seconds=5)

    db.expire_all()
    stored = db.query(User).filter(User.email == "test@test.com").one()
    assert stored.terms_version == CURRENT_TERMS_VERSION
    assert stored.terms_accepted_at is not None


def test_accept_terms_again_updates_outdated_record(client, auth_headers, db):
    user = user_repository.get_user_by_email(db, "test@test.com")
    old_accepted_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
    user_repository.update_terms_consent(db, user, old_accepted_at, "0.0.1")

    response = client.post(CONSENT_URL, json=VALID_BODY, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["terms_version"] == CURRENT_TERMS_VERSION
    assert _parse_utc(body["terms_accepted_at"]) > old_accepted_at


def test_accept_terms_requires_authentication(client):
    response = client.post(CONSENT_URL, json=VALID_BODY)

    assert response.status_code == 401


def test_accept_terms_rejects_non_adult(client, auth_headers):
    response = client.post(
        CONSENT_URL, json={**VALID_BODY, "is_adult": False}, headers=auth_headers
    )

    assert response.status_code == 422


def test_accept_terms_rejects_empty_version(client, auth_headers):
    response = client.post(
        CONSENT_URL, json={**VALID_BODY, "terms_version": "   "}, headers=auth_headers
    )

    assert response.status_code == 422


def test_accept_terms_rejects_non_current_version(client, auth_headers):
    response = client.post(
        CONSENT_URL, json={**VALID_BODY, "terms_version": "0.0.1"}, headers=auth_headers
    )

    assert response.status_code == 422


def test_me_exposes_consent_fields(client, auth_headers):
    initial = client.get("/auth/me", headers=auth_headers).json()
    assert initial["terms_accepted_at"] is None
    assert initial["terms_version"] is None

    client.post(CONSENT_URL, json=VALID_BODY, headers=auth_headers)

    me = client.get("/auth/me", headers=auth_headers).json()
    assert me["terms_version"] == CURRENT_TERMS_VERSION
    assert me["terms_accepted_at"].endswith("Z")

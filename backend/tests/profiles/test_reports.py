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
    user = create_test_user(email="reported@test.com")
    return _make_profile(db, user.id, "Perfil Reportado", "Madrid")


def test_report_creates_and_blocks(client, auth_headers, other_profile):
    res = client.post(
        f"/profiles/{other_profile.id}/report",
        headers=auth_headers,
        json={"reason": "harassment", "detail": "Mensajes insistentes"},
    )
    assert res.status_code == 204

    res = client.get("/profiles/me/blocked", headers=auth_headers)
    assert res.status_code == 200
    assert [p["id"] for p in res.json()] == [other_profile.id]


def test_report_on_already_blocked_profile_succeeds(
    client, auth_headers, other_profile
):
    client.post(f"/profiles/{other_profile.id}/block", headers=auth_headers)

    res = client.post(
        f"/profiles/{other_profile.id}/report",
        headers=auth_headers,
        json={"reason": "spam"},
    )
    assert res.status_code == 204

    res = client.get("/profiles/me/blocked", headers=auth_headers)
    assert [p["id"] for p in res.json()] == [other_profile.id]


def test_report_duplicate_returns_409(client, auth_headers, other_profile):
    client.post(
        f"/profiles/{other_profile.id}/report",
        headers=auth_headers,
        json={"reason": "spam"},
    )

    res = client.post(
        f"/profiles/{other_profile.id}/report",
        headers=auth_headers,
        json={"reason": "spam"},
    )
    assert res.status_code == 409
    assert res.json()["code"] == "USER_REPORT_ALREADY_EXISTS"


def test_report_own_profile_returns_400(client, db, auth_headers):
    from app.repositories import user_repository

    me = user_repository.get_user_by_email(db, "test@test.com")
    my_profile = _make_profile(db, me.id, "Yo", "Sevilla")

    res = client.post(
        f"/profiles/{my_profile.id}/report",
        headers=auth_headers,
        json={"reason": "other"},
    )
    assert res.status_code == 400
    assert res.json()["code"] == "CANNOT_REPORT_SELF"


def test_report_unknown_profile_returns_404(client, auth_headers):
    res = client.post(
        "/profiles/999999/report",
        headers=auth_headers,
        json={"reason": "spam"},
    )
    assert res.status_code == 404


def test_report_invalid_reason_returns_422(client, auth_headers, other_profile):
    res = client.post(
        f"/profiles/{other_profile.id}/report",
        headers=auth_headers,
        json={"reason": "no_me_cae_bien"},
    )
    assert res.status_code == 422


def test_report_detail_too_long_returns_422(client, auth_headers, other_profile):
    res = client.post(
        f"/profiles/{other_profile.id}/report",
        headers=auth_headers,
        json={"reason": "other", "detail": "a" * 1001},
    )
    assert res.status_code == 422


def test_report_requires_auth(client, other_profile):
    res = client.post(f"/profiles/{other_profile.id}/report", json={"reason": "spam"})
    assert res.status_code == 401


def _reporter_and_target(db, create_test_user):
    reporter = create_test_user(email="rep@test.com")
    target = create_test_user(email="tgt@test.com")
    return reporter, _make_profile(db, target.id, "Objetivo", "Madrid")


def test_block_failure_leaves_no_report_so_retry_works(
    db, create_test_user, monkeypatch
):
    from app.repositories import block_repository, report_repository
    from app.schemas.report import ReportCreate
    from app.services import block_service, report_service

    reporter, target_profile = _reporter_and_target(db, create_test_user)
    payload = ReportCreate(reason="harassment")
    real_block = block_service.block_profile

    def failing_block(*args, **kwargs):
        raise RuntimeError("fallo de BD")

    monkeypatch.setattr(block_service, "block_profile", failing_block)
    with pytest.raises(RuntimeError):
        report_service.report_profile(db, reporter.id, target_profile.id, payload)
    assert not report_repository.exists(db, reporter.id, target_profile.user_id)

    monkeypatch.setattr(block_service, "block_profile", real_block)
    report_service.report_profile(db, reporter.id, target_profile.id, payload)

    assert report_repository.exists(db, reporter.id, target_profile.user_id)
    assert block_repository.is_blocked(db, reporter.id, target_profile.user_id)


def test_report_failure_after_block_is_recoverable_on_retry(
    db, create_test_user, monkeypatch
):
    from app.repositories import block_repository, report_repository
    from app.schemas.report import ReportCreate
    from app.services import report_service

    reporter, target_profile = _reporter_and_target(db, create_test_user)
    payload = ReportCreate(reason="spam")
    real_add = report_repository.add

    def failing_add(*args, **kwargs):
        raise RuntimeError("fallo de BD")

    monkeypatch.setattr(report_repository, "add", failing_add)
    with pytest.raises(RuntimeError):
        report_service.report_profile(db, reporter.id, target_profile.id, payload)
    assert block_repository.is_blocked(db, reporter.id, target_profile.user_id)

    monkeypatch.setattr(report_repository, "add", real_add)
    report_service.report_profile(db, reporter.id, target_profile.id, payload)

    assert report_repository.exists(db, reporter.id, target_profile.user_id)

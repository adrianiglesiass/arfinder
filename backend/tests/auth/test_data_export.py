from app.repositories import (
    conversation_repository,
    message_repository,
    profile_photo_repository,
    profile_repository,
)
from app.schemas.profile import ProfileCreate, ScheduleEnum, TypeEnum

EXPORT_URL = "/auth/me/export"


def _profile(db, user_id, name):
    return profile_repository.create_profile(
        db,
        user_id,
        ProfileCreate(
            name=name,
            age=29,
            city="Valencia",
            bio="Hola",
            max_budget=500,
            schedule=ScheduleEnum.night,
            type=TypeEnum.looking_for_roommate,
            room_description="Habitación exterior",
        ),
    )


def test_export_requires_authentication(client):
    response = client.get(EXPORT_URL)

    assert response.status_code == 401


def test_export_downloads_user_data_as_attachment(
    client, auth_headers, db, create_test_user
):
    me = client.get("/auth/me", headers=auth_headers).json()
    my_profile = _profile(db, me["id"], "Yo")
    profile_photo_repository.create_profile_photo(
        db, my_profile.id, "https://cdn/me.jpg"
    )

    other = create_test_user(email="other.person@test.com", accepted_terms=True)
    _profile(db, other.id, "Otra")
    stranger = create_test_user(email="stranger@test.com")

    conversation = conversation_repository.create_conversation(db, me["id"], other.id)
    message_repository.create_message(db, conversation.id, me["id"], "Hola, ¿qué tal?")
    message_repository.create_message(db, conversation.id, other.id, "Muy bien")

    # A conversation the user is not part of must not be exported.
    unrelated = conversation_repository.create_conversation(db, other.id, stranger.id)
    message_repository.create_message(db, unrelated.id, stranger.id, "Secreto")

    response = client.get(EXPORT_URL, headers=auth_headers)

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="arfinder-datos.json"'
    )
    assert response.headers["content-type"].startswith("application/json")

    body = response.json()
    assert body["user"]["email"] == "test@test.com"
    assert "created_at" in body["user"]
    assert "terms_accepted_at" in body["user"]
    assert "terms_version" in body["user"]

    assert body["profile"]["name"] == "Yo"
    assert body["profile"]["room_description"] == "Habitación exterior"
    assert [p["photo_url"] for p in body["profile"]["photos"]] == ["https://cdn/me.jpg"]

    assert len(body["conversations"]) == 1
    exported = body["conversations"][0]
    assert exported["other_participant"] == {"id": other.id, "name": "Otra"}
    assert [(m["content"], m["is_mine"]) for m in exported["messages"]] == [
        ("Hola, ¿qué tal?", True),
        ("Muy bien", False),
    ]

    text = response.text
    assert "other.person@test.com" not in text
    assert "stranger@test.com" not in text
    assert "Secreto" not in text


def test_export_without_profile_or_conversations(client, auth_headers):
    response = client.get(EXPORT_URL, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "test@test.com"
    assert body["profile"] is None
    assert body["conversations"] == []

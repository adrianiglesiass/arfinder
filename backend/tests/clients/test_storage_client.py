from app.clients.storage_client import extract_public_id_from_url


def test_extract_public_id_from_url_with_version():
    url = (
        "https://res.cloudinary.com/arfinder/image/upload/v1615010000/"
        "arfinder/profiles/42/abc-def.jpg"
    )
    assert extract_public_id_from_url(url) == "arfinder/profiles/42/abc-def.jpg"


def test_extract_public_id_from_url_returns_none_for_foreign_url():
    assert extract_public_id_from_url("https://cdn.example.com/pic.jpg") is None
    assert extract_public_id_from_url("") is None

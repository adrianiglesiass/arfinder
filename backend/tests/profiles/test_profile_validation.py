import pytest

VALID_PROFILE = {
    "name": "Ana",
    "age": 28,
    "city": "Madrid",
    "type": "looking_for_flat",
}

NON_NULLABLE_FIELDS = ["name", "age", "city", "has_pets", "is_smoker", "type"]


@pytest.fixture
def my_profile(client, auth_headers):
    res = client.post("/profiles/me", json=VALID_PROFILE, headers=auth_headers)
    assert res.status_code == 200
    return res.json()


@pytest.mark.parametrize("field", ["name", "city"])
def test_create_rejects_values_longer_than_the_column(client, auth_headers, field):
    payload = {**VALID_PROFILE, field: "a" * 101}
    res = client.post("/profiles/me", json=payload, headers=auth_headers)
    assert res.status_code == 422


@pytest.mark.parametrize("field", ["name", "city"])
def test_create_accepts_values_that_fit_the_column(client, auth_headers, field):
    payload = {**VALID_PROFILE, field: "a" * 100}
    res = client.post("/profiles/me", json=payload, headers=auth_headers)
    assert res.status_code == 200


@pytest.mark.parametrize("field", ["name", "city"])
def test_update_rejects_values_longer_than_the_column(
    client, auth_headers, my_profile, field
):
    res = client.patch("/profiles/me", json={field: "a" * 101}, headers=auth_headers)
    assert res.status_code == 422


@pytest.mark.parametrize("field", NON_NULLABLE_FIELDS)
def test_update_rejects_explicit_null_in_required_fields(
    client, auth_headers, my_profile, field
):
    res = client.patch("/profiles/me", json={field: None}, headers=auth_headers)
    assert res.status_code == 422

    res = client.get("/profiles/me", headers=auth_headers)
    assert res.json()["name"] == "Ana"


def test_update_accepts_null_in_optional_fields(client, auth_headers, my_profile):
    client.patch("/profiles/me", json={"bio": "Hola"}, headers=auth_headers)

    res = client.patch("/profiles/me", json={"bio": None}, headers=auth_headers)

    assert res.status_code == 200
    assert res.json()["bio"] is None


def test_update_leaves_omitted_fields_untouched(client, auth_headers, my_profile):
    res = client.patch("/profiles/me", json={"age": 29}, headers=auth_headers)

    assert res.status_code == 200
    assert res.json()["age"] == 29
    assert res.json()["name"] == "Ana"

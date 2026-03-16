from unittest.mock import AsyncMock, MagicMock, patch

import pytest

NOMINATIM_RESPONSE = [
    {"display_name": "Madrid, Comunidad de Madrid, España"},
    {"display_name": "Madrid, Cundinamarca, Colombia"},
    {"display_name": "Madrid, Iowa, United States"},
    {"display_name": "A Coruña, Galicia, España"},
    {"display_name": "Coruña, Galicia, España"},
]


@pytest.fixture
def mock_nominatim():
    mock_response = MagicMock()
    mock_response.json.return_value = NOMINATIM_RESPONSE
    mock_response.raise_for_status = MagicMock()

    mock_async_client = AsyncMock()
    mock_async_client.get = AsyncMock(return_value=mock_response)

    with patch("app.routes.cities.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_async_client)
        mock_client.return_value.__aexit__ = AsyncMock(return_value=False)
        yield mock_client


def test_city_search_returns_list(client, mock_nominatim):
    res = client.get("/cities/search?q=Mad")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) > 0


def test_city_search_deduplicates(client, mock_nominatim):
    res = client.get("/cities/search?q=Mad")
    cities = res.json()
    assert len(cities) == len(set(cities))


def test_city_search_returns_first_part_of_display_name(client, mock_nominatim):
    res = client.get("/cities/search?q=Mad")
    cities = res.json()
    assert "Madrid" in cities


def test_city_search_empty_query_returns_422(client):
    res = client.get("/cities/search?q=M")
    assert res.status_code == 422


def test_city_search_no_query_returns_422(client):
    res = client.get("/cities/search")
    assert res.status_code == 422


def test_city_search_handles_special_characters(client, mock_nominatim):
    res = client.get("/cities/search?q=Coru")
    cities = res.json()
    assert "A Coruña" in cities or "Coruña" in cities

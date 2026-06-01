import httpx
import pytest

from app.services import city_service


@pytest.fixture(scope="module", autouse=True)
def _loaded():
    city_service.load_cities()


@pytest.fixture(autouse=True)
def _clear_cache():
    city_service._fallback_cache.clear()
    yield
    city_service._fallback_cache.clear()


def test_prefix_search_returns_match():
    assert "Madrid" in city_service.search_cities_local("madr")


def test_results_sorted_by_population_desc():
    assert city_service.search_cities_local("madr")[0] == "Madrid"


def test_accent_insensitive_search():
    assert "A Coruña" in city_service.search_cities_local("a coru")


def test_word_prefix_ignores_leading_article():
    assert "A Coruña" in city_service.search_cities_local("coru")


def test_word_prefix_matches_inner_word():
    assert "Las Palmas de Gran Canaria" in city_service.search_cities_local("palmas")
    assert "El Ejido" in city_service.search_cities_local("ejido")


def test_query_can_use_accents():
    assert "A Coruña" in city_service.search_cities_local("a coruñ")


def test_short_query_returns_empty():
    assert city_service.search_cities_local("m") == []


def test_unknown_city_returns_empty():
    assert city_service.search_cities_local("zzzznotacity") == []


def test_results_capped_to_limit():
    assert len(city_service.search_cities_local("a")) <= city_service._RESULT_LIMIT
    assert len(city_service.search_cities_local("sa")) <= city_service._RESULT_LIMIT


class _Response:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _Client:
    def __init__(self, *, payload=None, raise_exc=None):
        self._payload = payload
        self._raise = raise_exc

    async def get(self, *args, **kwargs):
        if self._raise is not None:
            raise self._raise
        return _Response(self._payload)


@pytest.mark.asyncio
async def test_fallback_parses_display_name(monkeypatch):
    monkeypatch.setattr(
        city_service,
        "_client",
        _Client(payload=[{"display_name": "Foovillage, Lugo, Spain"}]),
    )
    assert await city_service.search_cities_fallback("foovillage") == ["Foovillage"]


@pytest.mark.asyncio
async def test_fallback_returns_empty_on_http_status_error(monkeypatch):
    error = httpx.HTTPStatusError(
        "403", request=httpx.Request("GET", "https://x"), response=httpx.Response(403)
    )
    monkeypatch.setattr(city_service, "_client", _Client(raise_exc=error))
    assert await city_service.search_cities_fallback("foovillage") == []


@pytest.mark.asyncio
async def test_fallback_returns_empty_on_timeout(monkeypatch):
    monkeypatch.setattr(
        city_service, "_client", _Client(raise_exc=httpx.TimeoutException("slow"))
    )
    assert await city_service.search_cities_fallback("foovillage") == []


@pytest.mark.asyncio
async def test_fallback_returns_empty_on_connect_error(monkeypatch):
    monkeypatch.setattr(
        city_service, "_client", _Client(raise_exc=httpx.ConnectError("down"))
    )
    assert await city_service.search_cities_fallback("foovillage") == []


@pytest.mark.asyncio
async def test_fallback_too_short_returns_empty(monkeypatch):
    monkeypatch.setattr(city_service, "_client", _Client(payload=[]))
    assert await city_service.search_cities_fallback("fo") == []


@pytest.mark.asyncio
async def test_fallback_parse_error_propagates(monkeypatch):
    """A non-network bug (malformed payload) must surface, not be swallowed."""

    class _BadResponse:
        def raise_for_status(self):
            return None

        def json(self):
            raise ValueError("malformed payload")

    class _BadClient:
        async def get(self, *args, **kwargs):
            return _BadResponse()

    monkeypatch.setattr(city_service, "_client", _BadClient())
    with pytest.raises(ValueError):
        await city_service.search_cities_fallback("foovillage")


@pytest.mark.asyncio
async def test_fallback_uses_cache(monkeypatch):
    calls = {"n": 0}

    class _CountingClient:
        async def get(self, *args, **kwargs):
            calls["n"] += 1
            return _Response([{"display_name": "Foovillage, Lugo, Spain"}])

    monkeypatch.setattr(city_service, "_client", _CountingClient())
    await city_service.search_cities_fallback("foovillage")
    await city_service.search_cities_fallback("foovillage")
    assert calls["n"] == 1

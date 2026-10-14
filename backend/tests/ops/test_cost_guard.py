import json
import urllib.error
import urllib.parse

import pytest

from scripts.cost_guard import (
    BYTES_PER_GB,
    EXIT_ERROR,
    CostGuardError,
    Verdict,
    authorization_header,
    egress_query,
    fetch_egress_bytes,
    main,
    parse_vector_sum,
)


def _vector(*values: str) -> dict:
    return {
        "status": "success",
        "data": {
            "resultType": "vector",
            "result": [{"metric": {}, "value": [1700000000, v]} for v in values],
        },
    }


class FakeFetch:
    def __init__(self, payload: object = None, error: Exception | None = None):
        self.payload = payload
        self.error = error
        self.requests = []

    def __call__(self, request, timeout):
        self.requests.append(request)
        if self.error:
            raise self.error
        if isinstance(self.payload, bytes):
            return self.payload
        return json.dumps(self.payload).encode()


def _outputs(path) -> dict[str, str]:
    lines = path.read_text().splitlines()
    return dict(line.split("=", 1) for line in lines)


@pytest.fixture
def env(tmp_path):
    return {
        "FLY_READONLY_TOKEN": "fm2_secret",
        "GITHUB_OUTPUT": str(tmp_path / "output"),
        "GITHUB_STEP_SUMMARY": str(tmp_path / "summary"),
    }


@pytest.mark.parametrize(
    ("token", "expected"),
    [
        ("fm2_abc", "FlyV1 fm2_abc"),
        ("FlyV1 fm2_abc", "FlyV1 fm2_abc"),
        ("  FlyV1 fm2_abc\n", "FlyV1 fm2_abc"),
        ("Bearer xyz", "Bearer xyz"),
    ],
)
def test_authorization_header_keeps_or_adds_scheme(token, expected):
    assert authorization_header(token) == expected


def test_authorization_header_rejects_empty_token():
    with pytest.raises(CostGuardError):
        authorization_header("   ")


def test_egress_query_targets_the_app_counter():
    assert (
        egress_query("arfinder-api", "24h")
        == 'sum(increase(fly_edge_data_out{app="arfinder-api"}[24h]))'
    )


@pytest.mark.parametrize(
    ("app", "window"),
    [('x"} or vector(1e12', "24h"), ("Arfinder", "24h"), ("app", "1y"), ("app", "")],
)
def test_egress_query_rejects_untrusted_input(app, window):
    with pytest.raises(CostGuardError):
        egress_query(app, window)


def test_parse_vector_sum_adds_every_series():
    assert parse_vector_sum(_vector("1.5", "2.5")) == 4.0


def test_parse_vector_sum_returns_none_without_series():
    assert parse_vector_sum(_vector()) is None


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "error", "error": "bad query"},
        {"status": "success", "data": {}},
        {"status": "success", "data": {"result": [{"value": []}]}},
        _vector("NaN"),
        _vector("-1"),
        ["not", "a", "dict"],
    ],
)
def test_parse_vector_sum_rejects_unusable_payloads(payload):
    with pytest.raises(CostGuardError):
        parse_vector_sum(payload)


def test_fetch_builds_authenticated_org_query():
    fetch = FakeFetch(_vector("42"))

    assert fetch_egress_bytes("my-org", "arfinder-api", "fm2_t", fetch=fetch) == 42.0

    request = fetch.requests[0]
    url = urllib.parse.urlsplit(request.full_url)
    assert url.netloc == "api.fly.io"
    assert url.path == "/prometheus/my-org/api/v1/query"
    assert urllib.parse.parse_qs(url.query)["query"] == [egress_query("arfinder-api")]
    assert request.get_header("Authorization") == "FlyV1 fm2_t"


@pytest.mark.parametrize(
    "fetch",
    [
        FakeFetch(error=urllib.error.URLError("unreachable")),
        FakeFetch(error=TimeoutError()),
        FakeFetch(payload=b"<html>not json</html>"),
    ],
)
def test_fetch_wraps_transport_failures(fetch):
    with pytest.raises(CostGuardError):
        fetch_egress_bytes("org", "arfinder-api", "fm2_t", fetch=fetch)


def test_verdict_is_over_budget_only_above_the_limit():
    assert Verdict(egress_bytes=6.5 * BYTES_PER_GB, budget_gb=6.5).over_budget is False
    assert Verdict(egress_bytes=6.6 * BYTES_PER_GB, budget_gb=6.5).over_budget is True


def test_main_reports_normal_usage_without_alarm(env, tmp_path):
    fetch = FakeFetch(_vector(str(1 * BYTES_PER_GB)))

    assert main([], env, fetch) == 0

    assert _outputs(tmp_path / "output") == {
        "over_budget": "false",
        "egress_gb": "1.000",
        "budget_gb": "6.5",
    }
    assert "ok" in (tmp_path / "summary").read_text()


def test_main_flags_egress_over_budget(env, tmp_path):
    env["COST_GUARD_MAX_DAILY_EGRESS_GB"] = "2"
    fetch = FakeFetch(_vector(str(3 * BYTES_PER_GB)))

    assert main([], env, fetch) == 0

    outputs = _outputs(tmp_path / "output")
    assert outputs["over_budget"] == "true"
    assert outputs["budget_gb"] == "2"


def test_main_treats_missing_series_as_zero_with_warning(env, tmp_path, capsys):
    assert main([], env, FakeFetch(_vector())) == 0

    assert _outputs(tmp_path / "output")["over_budget"] == "false"
    assert "::warning::" in capsys.readouterr().out


def test_main_uses_org_and_app_from_env(env):
    env.update({"FLY_ORG": "acme", "FLY_APP": "other-app"})
    fetch = FakeFetch(_vector("0"))

    assert main([], env, fetch) == 0

    url = fetch.requests[0].full_url
    assert "/prometheus/acme/" in url
    assert "other-app" in urllib.parse.unquote_plus(url)


@pytest.mark.parametrize(
    ("overrides", "fetch"),
    [
        ({"FLY_READONLY_TOKEN": ""}, FakeFetch(_vector("1"))),
        ({}, FakeFetch(error=urllib.error.URLError("down"))),
        ({}, FakeFetch({"status": "error"})),
        ({"COST_GUARD_MAX_DAILY_EGRESS_GB": "0"}, FakeFetch(_vector("1"))),
        ({"COST_GUARD_MAX_DAILY_EGRESS_GB": "nan"}, FakeFetch(_vector("1"))),
        ({"COST_GUARD_MAX_DAILY_EGRESS_GB": "lots"}, FakeFetch(_vector("1"))),
    ],
)
def test_main_fails_closed_without_writing_a_verdict(env, tmp_path, overrides, fetch):
    env.update(overrides)

    assert main([], env, fetch) == EXIT_ERROR

    assert not (tmp_path / "output").exists()

"""Egress cost watchdog for the Fly.io deployment.

Measures the app's edge egress over a rolling window through Fly's managed
Prometheus and reports whether it exceeds the daily budget. It only measures
and decides: acting on the verdict (scaling to zero, opening an issue) belongs
to `.github/workflows/cost-guard.yml`. Any failure exits with code 2 and never
reports `over_budget=true`, so a broken query can never stop the deployment.

Spec: specs/fix-abuse-cost-ceiling.md (#59). Standard library only.
"""

from __future__ import annotations

import argparse
import http.client
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

PROMETHEUS_BASE_URL = "https://api.fly.io/prometheus"
DEFAULT_APP = "arfinder-api"
DEFAULT_ORG = "personal"
DEFAULT_WINDOW = "24h"
# $4/month budget at $0.02/GB (Europe) = 200 GB/month ~= 6.5 GB/day.
DEFAULT_MAX_DAILY_EGRESS_GB = 6.5
BYTES_PER_GB = 1_000_000_000  # Fly bills decimal GB.
REQUEST_TIMEOUT_SECONDS = 30.0
EXIT_ERROR = 2

_APP_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_WINDOW = re.compile(r"^[1-9][0-9]*[smhd]$")
_TOKEN_SCHEMES = ("FlyV1 ", "Bearer ")

Fetch = Callable[[urllib.request.Request, float], bytes]


class CostGuardError(RuntimeError):
    """The egress could not be measured; the caller must not act on it."""


@dataclass(frozen=True)
class Verdict:
    egress_bytes: float
    budget_gb: float

    @property
    def egress_gb(self) -> float:
        return self.egress_bytes / BYTES_PER_GB

    @property
    def over_budget(self) -> bool:
        return self.egress_gb > self.budget_gb


def authorization_header(token: str) -> str:
    """Tokens from `fly tokens create` use the FlyV1 scheme; keep an explicit one."""
    token = token.strip()
    if not token:
        raise CostGuardError("the Fly token is empty")
    if token.startswith(_TOKEN_SCHEMES):
        return token
    return f"FlyV1 {token}"


def egress_query(app: str, window: str = DEFAULT_WINDOW) -> str:
    if not _APP_NAME.match(app):
        raise CostGuardError(f"invalid Fly app name: {app!r}")
    if not _WINDOW.match(window):
        raise CostGuardError(f"invalid Prometheus window: {window!r}")
    return f'sum(increase(fly_edge_data_out{{app="{app}"}}[{window}]))'


def parse_vector_sum(payload: object) -> float | None:
    """Sum an instant-vector response; None when the vector has no series."""
    if not isinstance(payload, dict) or payload.get("status") != "success":
        raise CostGuardError(f"Prometheus query did not succeed: {payload!r}")
    result = (payload.get("data") or {}).get("result")
    if not isinstance(result, list):
        raise CostGuardError("Prometheus response has no result vector")
    if not result:
        return None
    try:
        total = sum(float(series["value"][1]) for series in result)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise CostGuardError(f"malformed Prometheus sample: {exc}") from exc
    if not math.isfinite(total) or total < 0:
        raise CostGuardError(f"unusable egress sample: {total}")
    return total


def _urlopen(request: urllib.request.Request, timeout: float) -> bytes:
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def fetch_egress_bytes(
    org: str,
    app: str,
    token: str,
    window: str = DEFAULT_WINDOW,
    fetch: Fetch = _urlopen,
) -> float | None:
    query = urllib.parse.urlencode({"query": egress_query(app, window)})
    url = (
        f"{PROMETHEUS_BASE_URL}/{urllib.parse.quote(org, safe='')}/api/v1/query?{query}"
    )
    request = urllib.request.Request(
        url, headers={"Authorization": authorization_header(token)}
    )
    try:
        body = fetch(request, REQUEST_TIMEOUT_SECONDS)
        payload = json.loads(body)
    except (urllib.error.URLError, http.client.HTTPException, OSError) as exc:
        raise CostGuardError(f"Prometheus request failed: {exc}") from exc
    except ValueError as exc:
        raise CostGuardError(f"Prometheus returned invalid JSON: {exc}") from exc
    return parse_vector_sum(payload)


def _write_lines(path: str | None, lines: Sequence[str]) -> None:
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.writelines(f"{line}\n" for line in lines)


def _parse_args(argv: Sequence[str], env: Mapping[str, str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--app", default=env.get("FLY_APP") or DEFAULT_APP)
    parser.add_argument("--org", default=env.get("FLY_ORG") or DEFAULT_ORG)
    parser.add_argument("--window", default=DEFAULT_WINDOW)
    parser.add_argument(
        "--max-daily-gb",
        type=float,
        default=float(
            env.get("COST_GUARD_MAX_DAILY_EGRESS_GB") or DEFAULT_MAX_DAILY_EGRESS_GB
        ),
    )
    return parser.parse_args(argv)


def main(
    argv: Sequence[str] | None = None,
    env: Mapping[str, str] | None = None,
    fetch: Fetch = _urlopen,
) -> int:
    env = os.environ if env is None else env
    try:
        args = _parse_args(sys.argv[1:] if argv is None else argv, env)
        if not math.isfinite(args.max_daily_gb) or args.max_daily_gb <= 0:
            raise CostGuardError("the daily egress budget must be positive")
        egress = fetch_egress_bytes(
            args.org, args.app, env.get("FLY_READONLY_TOKEN", ""), args.window, fetch
        )
    except (CostGuardError, ValueError) as exc:
        print(f"::error::cost guard could not measure egress: {exc}")
        return EXIT_ERROR

    if egress is None:
        print(
            f"::warning::no fly_edge_data_out series for app {args.app!r} in org "
            f"{args.org!r} over {args.window}; check FLY_ORG and the app name"
        )
    verdict = Verdict(egress_bytes=egress or 0.0, budget_gb=args.max_daily_gb)
    summary = (
        f"Egress of {args.app} over the last {args.window}: "
        f"{verdict.egress_gb:.3f} GB (budget {verdict.budget_gb:g} GB) -> "
        f"{'OVER BUDGET' if verdict.over_budget else 'ok'}"
    )
    print(summary)
    _write_lines(
        env.get("GITHUB_OUTPUT"),
        [
            f"over_budget={'true' if verdict.over_budget else 'false'}",
            f"egress_gb={verdict.egress_gb:.3f}",
            f"budget_gb={verdict.budget_gb:g}",
        ],
    )
    _write_lines(env.get("GITHUB_STEP_SUMMARY"), [summary])
    return 0


if __name__ == "__main__":
    sys.exit(main())

import csv
import io
import json
import os
import sys
import unicodedata
import urllib.request
import zipfile

GEONAMES_BASE = "https://download.geonames.org/export/dump"
COUNTRY_ZIP = f"{GEONAMES_BASE}/ES.zip"

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "app",
    "data",
    "cities.json",
)


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(c for c in normalized if not unicodedata.combining(c)).lower()


def _download(url: str) -> bytes:
    print(f"Downloading {url} ...")
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def build() -> None:
    zip_bytes = _download(COUNTRY_ZIP)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        country_data = zf.read("ES.txt").decode("utf-8")

    places: list[tuple[int, str]] = []
    reader = csv.reader(io.StringIO(country_data), delimiter="\t")
    for row in reader:
        feature_class = row[6]
        if feature_class != "P":
            continue

        name = row[1].strip()
        if not name:
            continue

        try:
            population = int(row[14] or 0)
        except ValueError:
            population = 0

        places.append((population, name))

    places.sort(reverse=True)

    seen: set[str] = set()
    names: list[str] = []
    for _population, name in places:
        key = _strip_accents(name)
        if key in seen:
            continue
        seen.add(key)
        names.append(name)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(names, f, ensure_ascii=False, separators=(",", ":"))

    size_bytes = os.path.getsize(OUTPUT_PATH)
    print(f"Wrote {len(names)} cities to {OUTPUT_PATH}")
    print(
        f"File size: {size_bytes / 1024:.1f} KiB ({size_bytes / 1024 / 1024:.2f} MiB)"
    )


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to build cities dataset: {exc}", file=sys.stderr)
        sys.exit(1)

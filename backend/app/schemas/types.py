from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def _serialize_utc(dt: datetime) -> str:
    # Naive datetimes are stored as UTC; aware ones are converted explicitly.
    utc_dt = (
        dt.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None
        else dt.astimezone(timezone.utc)
    )
    return utc_dt.isoformat().replace("+00:00", "Z")


UTCDatetime = Annotated[
    datetime,
    PlainSerializer(_serialize_utc, return_type=str, when_used="json"),
]

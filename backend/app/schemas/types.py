from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer

UTCDatetime = Annotated[
    datetime,
    PlainSerializer(
        lambda dt: dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
        return_type=str,
        when_used="json",
    ),
]

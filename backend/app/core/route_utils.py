from typing import Any, Optional
from fastapi import HTTPException


def parse_age_param(v: Any, name: str) -> Optional[int]:
    if v is None or str(v).lower() == "null":
        return None
    try:
        val = int(v)
        if not (18 <= val <= 120):
            raise ValueError()
        return val
    except (ValueError, TypeError, OverflowError):
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["query", name],
                    "msg": "Age must be an integer between 18 and 120",
                    "type": "value_error",
                }
            ],
        )


def parse_bool_param(v: Any, name: str) -> Optional[bool]:
    if v is None or str(v).lower() == "null":
        return None
    if isinstance(v, bool):
        return v
    s = str(v).lower()
    if s in ("true", "1", "t", "y", "yes"):
        return True
    if s in ("false", "0", "f", "n", "no"):
        return False
    raise HTTPException(
        status_code=422,
        detail=[
            {
                "loc": ["query", name],
                "msg": "Invalid boolean value",
                "type": "value_error",
            }
        ],
    )

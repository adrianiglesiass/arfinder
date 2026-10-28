from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.types import UTCDatetime
from app.core.constants import CURRENT_TERMS_VERSION
from app.core.validators import validate_password_strength


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        return validate_password_strength(value)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: UTCDatetime
    terms_accepted_at: Optional[UTCDatetime] = None
    terms_version: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConsentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    terms_version: str = Field(..., min_length=1, max_length=50)
    is_adult: Literal[True]

    @field_validator("terms_version")
    @classmethod
    def validate_terms_version(cls, value: str) -> str:
        if value != CURRENT_TERMS_VERSION:
            raise ValueError(
                f"terms_version must be the current version ({CURRENT_TERMS_VERSION})"
            )
        return value


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None

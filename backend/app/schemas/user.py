from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.schemas.types import UTCDatetime
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

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None

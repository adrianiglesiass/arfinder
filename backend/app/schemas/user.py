from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, ClassVar
from pydantic.config import ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    ConfigDict: ClassVar = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[int] = None

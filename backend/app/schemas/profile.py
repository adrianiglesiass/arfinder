from datetime import date
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.types import UTCDatetime


class ScheduleEnum(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"
    flexible = "flexible"


class TypeEnum(str, Enum):
    looking_for_flat = "looking_for_flat"
    looking_for_roommate = "looking_for_roommate"


class ProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., max_length=150)
    age: int = Field(..., ge=18, le=120)
    city: str = Field(..., max_length=150)
    bio: Optional[str] = Field(None, max_length=2000)
    max_budget: Optional[int] = Field(None, ge=0, le=1000000)
    has_pets: bool = False
    is_smoker: bool = False
    schedule: Optional[ScheduleEnum] = None
    gender: Optional[str] = Field(None, max_length=50)
    available_from: Optional[date] = None
    type: TypeEnum
    room_description: Optional[str] = Field(None, max_length=3000)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, max_length=150)
    age: Optional[int] = Field(None, ge=18, le=120)
    city: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = Field(None, max_length=2000)
    max_budget: Optional[int] = Field(None, ge=0, le=1000000)
    has_pets: Optional[bool] = None
    is_smoker: Optional[bool] = None
    schedule: Optional[ScheduleEnum] = None
    gender: Optional[str] = Field(None, max_length=50)
    available_from: Optional[date] = None
    type: Optional[TypeEnum] = None
    room_description: Optional[str] = Field(None, max_length=3000)


class ProfilePhotoResponse(BaseModel):
    id: int
    profile_id: int
    photo_url: str
    order: int
    is_main: bool
    created_at: UTCDatetime

    model_config = ConfigDict(from_attributes=True)


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    name: str
    age: int
    city: str
    bio: Optional[str] = None
    max_budget: Optional[int] = None
    has_pets: bool
    is_smoker: bool
    schedule: Optional[ScheduleEnum] = None
    gender: Optional[str] = None
    available_from: Optional[date] = None
    type: TypeEnum
    room_description: Optional[str] = None
    photos: List[ProfilePhotoResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("photos")
    @classmethod
    def _dedupe_photos(cls, photos: List[ProfilePhotoResponse]):
        seen = set()
        unique = []
        for photo in photos:
            if photo.photo_url in seen:
                continue
            seen.add(photo.photo_url)
            unique.append(photo)
        return unique


class ProfileSummary(BaseModel):
    id: int
    user_id: int
    name: str
    age: int
    city: str
    has_pets: bool
    is_smoker: bool
    type: TypeEnum
    max_budget: Optional[int] = None
    schedule: Optional[ScheduleEnum] = None
    gender: Optional[str] = None
    room_description: Optional[str] = None
    photo_urls: List[str] = []

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class ScheduleEnum(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"
    flexible = "flexible"


class TypeEnum(str, Enum):
    looking_for_flat = "looking_for_flat"
    looking_for_roommate = "looking_for_roommate"


class ProfileCreate(BaseModel):
    name: str
    age: int
    city: str
    bio: Optional[str] = None
    max_budget: Optional[int] = None
    has_pets: bool = False
    is_smoker: bool = False
    schedule: Optional[ScheduleEnum] = None
    gender: Optional[str] = None
    available_from: Optional[date] = None
    type: TypeEnum
    room_description: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    max_budget: Optional[int] = None
    has_pets: Optional[bool] = None
    is_smoker: Optional[bool] = None
    schedule: Optional[ScheduleEnum] = None
    gender: Optional[str] = None
    available_from: Optional[date] = None
    type: Optional[TypeEnum] = None
    room_description: Optional[str] = None


class ProfilePhotoResponse(BaseModel):
    id: int
    profile_id: int
    photo_url: str
    order: int
    is_main: bool
    created_at: datetime

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

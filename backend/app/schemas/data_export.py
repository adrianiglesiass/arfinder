from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.profile import ScheduleEnum, TypeEnum
from app.schemas.types import UTCDatetime


class ExportUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    created_at: Optional[UTCDatetime] = None
    terms_accepted_at: Optional[UTCDatetime] = None
    terms_version: Optional[str] = None


class ExportPhoto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    photo_url: str
    order: Optional[int] = None
    is_main: Optional[bool] = None
    created_at: Optional[UTCDatetime] = None


class ExportProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    photos: List[ExportPhoto] = []


class ExportParticipant(BaseModel):
    """The other party of a conversation. Only non-contact data is exported."""

    id: int
    name: Optional[str] = None


class ExportMessage(BaseModel):
    id: int
    sender_id: int
    is_mine: bool
    content: str
    sent_at: Optional[UTCDatetime] = None
    is_read: bool
    read_at: Optional[UTCDatetime] = None


class ExportConversation(BaseModel):
    id: int
    created_at: Optional[UTCDatetime] = None
    other_participant: ExportParticipant
    messages: List[ExportMessage] = []


class UserDataExport(BaseModel):
    generated_at: UTCDatetime
    user: ExportUser
    profile: Optional[ExportProfile] = None
    conversations: List[ExportConversation] = []

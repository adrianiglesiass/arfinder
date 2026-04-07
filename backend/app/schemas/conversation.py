from pydantic import BaseModel, ConfigDict

from app.schemas.types import UTCDatetime


class ConversationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    other_user_id: int


class LastMessageSummary(BaseModel):
    content: str
    sent_at: UTCDatetime
    is_read: bool

    model_config = ConfigDict(from_attributes=True)


class ParticipantSummary(BaseModel):
    user_id: int
    name: str
    photo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: int
    user1_id: int
    user2_id: int
    other_user: ParticipantSummary | None = None
    last_message: LastMessageSummary | None = None
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict

from app.schemas.types import UTCDatetime


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    sent_at: UTCDatetime
    is_read: bool
    read_at: UTCDatetime | None

    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    content: str

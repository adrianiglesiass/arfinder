from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    sent_at: datetime
    is_read: bool
    read_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

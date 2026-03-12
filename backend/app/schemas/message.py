from pydantic import BaseModel
from datetime import datetime


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    sent_at: datetime
    is_read: bool
    read_at: datetime | None

    model_config = {"from_attributes": True}

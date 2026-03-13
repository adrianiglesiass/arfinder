from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConversationCreate(BaseModel):
    other_user_id: int


class LastMessageSummary(BaseModel):
    content: str
    sent_at: datetime
    is_read: bool

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: int
    user1_id: int
    user2_id: int
    last_message: LastMessageSummary | None = None
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)

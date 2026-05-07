from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    content: str = Field(..., min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def _strip_and_require_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("content cannot be empty or whitespace")
        return stripped

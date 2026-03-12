from pydantic import BaseModel
from datetime import datetime


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    contenido: str
    fecha: datetime
    leido: bool
    leido_at: datetime | None

    model_config = {"from_attributes": True}

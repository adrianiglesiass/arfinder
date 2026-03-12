from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.message import MessageResponse
from app.services import message_service

router = APIRouter(prefix="/messages", tags=["messages"])


@router.patch("/{message_id}/read", response_model=MessageResponse)
def mark_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return message_service.mark_message_as_read(db, message_id, current_user.id)

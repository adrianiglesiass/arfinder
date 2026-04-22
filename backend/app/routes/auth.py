from fastapi import APIRouter, Depends, status, Header
import secrets
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.openapi import UNAUTH
from app.core.config import settings
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.auth_service import delete_user
from app.services.sync_service import cleanup_orphaned_users

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse, responses=UNAUTH)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, responses=UNAUTH)
async def delete_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_user(db, current_user)


@router.post("/sync-cleanup", include_in_schema=False)
async def sync_cleanup(
    x_sync_token: str = Header(None),
    db: Session = Depends(get_db),
):

    if not x_sync_token or not secrets.compare_digest(
        x_sync_token, settings.DEV_BYPASS_TOKEN
    ):
        return {"error": "Unauthorized"}, 401

    result = cleanup_orphaned_users(db)
    return result

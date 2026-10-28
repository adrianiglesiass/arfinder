from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
import secrets
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.openapi import UNAUTH
from app.core.config import settings
from app.core.rate_limit import rate_limiter, read_rate_limiter
from app.db.database import get_db
from app.models.user import User
from app.schemas.data_export import UserDataExport
from app.schemas.user import ConsentCreate, UserResponse
from app.services.auth_service import delete_user, record_terms_consent
from app.services.data_export_service import export_user_data
from app.services.sync_service import cleanup_orphaned_users

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get(
    "/me",
    response_model=UserResponse,
    responses=UNAUTH,
    dependencies=[Depends(read_rate_limiter)],
)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get(
    "/me/export",
    response_model=UserDataExport,
    responses=UNAUTH,
    dependencies=[Depends(read_rate_limiter)],
)
def export_my_data(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response.headers["Content-Disposition"] = (
        'attachment; filename="arfinder-datos.json"'
    )
    response.headers["Cache-Control"] = "no-store"
    return export_user_data(db, current_user.id)


@router.post("/me/consent", response_model=UserResponse, responses=UNAUTH)
def accept_terms(
    payload: ConsentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return record_terms_consent(db, current_user, payload.terms_version)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, responses=UNAUTH)
async def delete_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_user(db, current_user)


@router.post(
    "/sync-cleanup", include_in_schema=False, dependencies=[Depends(rate_limiter)]
)
def sync_cleanup(
    x_sync_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    expected = settings.DEV_BYPASS_TOKEN
    if (
        not expected
        or not x_sync_token
        or not secrets.compare_digest(x_sync_token, expected)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return cleanup_orphaned_users(db)

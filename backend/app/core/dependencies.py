from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.core.exceptions.auth import InvalidCredentialsError
from app.core.security import validate_insforge_token
from app.core.auth_utils import get_or_create_local_user

# 1. 401 para todos los errores de auth
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise InvalidCredentialsError()

    session = await validate_insforge_token(credentials.credentials)
    if not session or not session.user:
        raise InvalidCredentialsError()

    return get_or_create_local_user(db, session.user)

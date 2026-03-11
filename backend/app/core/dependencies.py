from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.repositories import user_repository
from app.core.config import settings
from app.core.exceptions.auth import InvalidCredentialsError
import jwt

# 1. 403 → 401 cuando no hay token
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise InvalidCredentialsError()

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise InvalidCredentialsError()
        user_id = int(user_id)
    except (jwt.InvalidTokenError, ValueError):
        raise InvalidCredentialsError()

    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise InvalidCredentialsError()
    return user

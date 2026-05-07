from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories import user_repository
from app.core.exceptions.auth import (
    InvalidCredentialsError,
)


def delete_user(db: Session, user: User):
    user = user_repository.get_user_by_id(db, user.id)
    if not user:
        raise InvalidCredentialsError()
    user_repository.delete_user(db, user)

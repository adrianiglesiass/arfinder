from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.repositories import user_repository
from app.core.exceptions.auth import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.core.security import hash_password, verify_password, create_access_token


def register_user(db: Session, user: UserCreate) -> User:
    existing = user_repository.get_user_by_email(db, user.email)
    if existing:
        raise EmailAlreadyRegisteredError(user.email)
    new_user = User(email=user.email,
                    password_hash=hash_password(user.password))
    return user_repository.create_user(db, new_user)


def login_user(db: Session, email: str, password: str) -> str:
    user = user_repository.get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()
    return create_access_token(user.id)

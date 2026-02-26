from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import User
from app.schemas.user import UserCreate
from app.repositories.user_repository import UserRepository
from dotenv import load_dotenv
import bcrypt
import jwt
import os

load_dotenv()

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(user_id: int) -> str:
    secret_key = os.getenv("SECRET_KEY")
    algorithm = os.getenv("ALGORITHM", "HS256")
    expire = datetime.now(timezone.utc) + \
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def register_user(db: Session, user: UserCreate) -> User:
    existing = UserRepository.get_by_email(db, user.email)
    if existing:
        raise ValueError("email already registered")
    new_user = User(email=user.email,
                    password_hash=hash_password(user.password))
    return UserRepository.create_user(db, new_user)


def login_user(db: Session, email: str, password: str) -> str:
    user = UserRepository.get_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        raise ValueError("invalid credentials")
    return create_access_token(user.id)

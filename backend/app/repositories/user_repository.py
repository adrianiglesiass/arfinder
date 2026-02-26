from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    @staticmethod
    def get_by_email(db: Session, email: str) -> User:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(db: Session, user: User) -> User:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

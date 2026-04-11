from typing import Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories import user_repository


def get_or_create_local_user(db: Session, insforge_user: Any) -> User:
    user = user_repository.get_user_by_insforge_id(db, str(insforge_user.id))

    if not user:
        user = user_repository.get_user_by_email(db, insforge_user.email)

        if not user:

            user = User(
                email=insforge_user.email,
                insforge_id=str(insforge_user.id),

            )
            user = user_repository.create_user(db, user)
        else:

            user.insforge_id = str(insforge_user.id)
            db.commit()
            db.refresh(user)

    return user

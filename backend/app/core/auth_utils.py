from typing import Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories import user_repository, profile_repository


def get_or_create_local_user(db: Session, insforge_user: Any) -> User:
    insforge_id = str(insforge_user.id)

    user = user_repository.get_user_by_insforge_id(db, insforge_id)
    if user:
        return user

    existing_user = user_repository.get_user_by_email(db, insforge_user.email)

    if existing_user:
        if existing_user.insforge_id and existing_user.insforge_id != insforge_id:
            if existing_user.profile:
                profile_repository.delete_profile(db, existing_user.profile)
            existing_user.insforge_id = None

        existing_user.insforge_id = insforge_id
        db.commit()
        db.refresh(existing_user)
        return existing_user

    new_user = User(
        email=insforge_user.email,
        insforge_id=insforge_id,
    )
    new_user = user_repository.create_user(db, new_user)
    return new_user

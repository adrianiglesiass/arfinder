from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions.favorite import FavoriteAlreadyExistsError
from app.models.favorite import Favorite


def add(db: Session, user_id: int, target_user_id: int) -> Favorite:
    if is_favorite(db, user_id, target_user_id):
        raise FavoriteAlreadyExistsError()

    favorite = Favorite(user_id=user_id, target_user_id=target_user_id)
    db.add(favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise FavoriteAlreadyExistsError() from None
    db.refresh(favorite)
    return favorite


def remove(db: Session, user_id: int, target_user_id: int) -> bool:
    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == user_id,
            Favorite.target_user_id == target_user_id,
        )
        .first()
    )
    if favorite is None:
        return False
    db.delete(favorite)
    db.commit()
    return True


def list_target_user_ids(db: Session, user_id: int, limit: int = 200) -> list[int]:
    rows = (
        db.query(Favorite.target_user_id)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc(), Favorite.id.desc())
        .limit(limit)
        .all()
    )
    return [row[0] for row in rows]


def is_favorite(db: Session, user_id: int, target_user_id: int) -> bool:
    exists = db.query(
        db.query(Favorite)
        .filter(
            Favorite.user_id == user_id,
            Favorite.target_user_id == target_user_id,
        )
        .exists()
    ).scalar()
    return bool(exists)

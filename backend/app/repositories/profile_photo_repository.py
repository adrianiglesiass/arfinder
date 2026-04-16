from sqlalchemy import func, text
from sqlalchemy.orm import Session
from app.models.profile_photo import ProfilePhoto


def _get_next_photo_order_locked(db: Session, profile_id: int) -> int:

    db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": profile_id})
    max_order = (
        db.query(func.max(ProfilePhoto.order))
        .filter(ProfilePhoto.profile_id == profile_id)
        .scalar()
    )
    return (max_order if max_order is not None else -1) + 1


def create_profile_photo(
    db: Session,
    profile_id: int,
    photo_url: str,
    order: int | None = None,
    is_main: bool = False,
) -> ProfilePhoto:
    if order is None:
        order = _get_next_photo_order_locked(db, profile_id)
    photo = ProfilePhoto(
        profile_id=profile_id, photo_url=photo_url, order=order, is_main=is_main
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def update_profile_photo(
    db: Session,
    photo: ProfilePhoto,
    order: int | None = None,
    is_main: bool | None = None,
) -> ProfilePhoto:
    if order is not None:
        photo.order = order
    if is_main is not None:
        photo.is_main = is_main
    db.commit()
    db.refresh(photo)
    return photo


def get_photos_by_profile(db: Session, profile_id: int) -> list[ProfilePhoto]:
    return (
        db.query(ProfilePhoto)
        .filter(ProfilePhoto.profile_id == profile_id)
        .order_by(ProfilePhoto.order.asc())
        .all()
    )


def get_profile_photo_by_id(db: Session, photo_id: int) -> ProfilePhoto:
    return db.query(ProfilePhoto).filter(ProfilePhoto.id == photo_id).first()


def delete_profile_photo(db: Session, photo: ProfilePhoto):
    db.delete(photo)
    db.commit()


def clear_main_profile_photo(db: Session, profile_id: int):
    db.query(ProfilePhoto).filter(
        ProfilePhoto.profile_id == profile_id, ProfilePhoto.is_main
    ).update({"is_main": False})
    db.commit()


def reorder_photos(
    db: Session, profile_id: int, ordered_ids: list[int]
) -> list[ProfilePhoto]:
    for new_order, photo_id in enumerate(ordered_ids):
        photo = (
            db.query(ProfilePhoto)
            .filter(ProfilePhoto.id == photo_id, ProfilePhoto.profile_id == profile_id)
            .first()
        )
        if photo:
            photo.order = new_order
    db.commit()
    return (
        db.query(ProfilePhoto)
        .filter(ProfilePhoto.profile_id == profile_id)
        .order_by(ProfilePhoto.order.asc())
        .all()
    )

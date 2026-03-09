from sqlalchemy.orm import Session
from app.models.profile_photo import ProfilePhoto


def create_profile_photo(
    db: Session, profile_id: int, foto_url: str, order: int = 0, is_main: bool = False
) -> ProfilePhoto:
    photo = ProfilePhoto(
        profile_id=profile_id, foto_url=foto_url, order=order, is_main=is_main
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def get_photos_by_profile(db: Session, profile_id: int):
    return (
        db.query(ProfilePhoto)
        .filter(ProfilePhoto.profile_id == profile_id)
        .order_by(ProfilePhoto.order.asc())
        .all()
    )


def get_profile_photo_by_id(db: Session, photo_id: int) -> ProfilePhoto | None:
    return db.query(ProfilePhoto).filter(ProfilePhoto.id == photo_id).first()


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


def delete_profile_photo(db: Session, photo: ProfilePhoto):
    db.delete(photo)
    db.commit()


def clear_main_profile_photo(db: Session, profile_id: int):
    db.query(ProfilePhoto).filter(
        ProfilePhoto.profile_id == profile_id, ProfilePhoto.is_main
    ).update({"is_main": False})
    db.commit()

from sqlalchemy.orm import Session
from app.repositories import profile_photo_repository
from app.repositories import profile_repository
from app.clients.cloudinary_client import upload_image
from app.core.exceptions.profile import ProfileNotFoundError
from app.core.exceptions.photo import PhotoAccessDeniedError, ImageUploadFailedError


def _get_profile_or_404(db: Session, user_id: int):
    profile = profile_repository.get_profile_by_user_id(db, user_id)
    if not profile:
        raise ProfileNotFoundError(user_id)
    return profile


def _get_photo_or_403(photo, profile):
    if not photo or photo.profile_id != profile.id:
        raise PhotoAccessDeniedError(photo.id if photo else None)
    return photo


def upload(db: Session, user_id: int, file) -> object:
    profile = _get_profile_or_404(db, user_id)
    try:
        secure_url = upload_image(file)
    except Exception as e:
        raise ImageUploadFailedError(str(e))
    return profile_photo_repository.create_profile_photo(db, profile.id, secure_url)


def list_for_user(db: Session, user_id: int):
    profile = _get_profile_or_404(db, user_id)
    return profile_photo_repository.get_photos_by_profile(db, profile.id)


def update(
    db: Session,
    user_id: int,
    photo_id: int,
    order: int | None = None,
    is_main: bool | None = None,
):
    profile = _get_profile_or_404(db, user_id)
    photo = profile_photo_repository.get_profile_photo_by_id(db, photo_id)
    _get_photo_or_403(photo, profile)
    if is_main is True:
        profile_photo_repository.clear_main_profile_photo(db, profile.id)
    return profile_photo_repository.update_profile_photo(
        db, photo, order=order, is_main=is_main
    )


def delete(db: Session, user_id: int, photo_id: int):
    profile = _get_profile_or_404(db, user_id)
    photo = profile_photo_repository.get_profile_photo_by_id(db, photo_id)
    _get_photo_or_403(photo, profile)
    profile_photo_repository.delete_profile_photo(db, photo)


def reorder(db: Session, user_id: int, ordered_ids: list[int]):
    profile = _get_profile_or_404(db, user_id)
    return profile_photo_repository.reorder_photos(db, profile.id, ordered_ids)

from app.core.exceptions.base import AppError


class PhotoError(AppError):
    pass


class PhotoAccessDeniedError(PhotoError):
    status_code = 403
    default_detail = "Not allowed to access this photo"

    def __init__(self, photo_id: int = None):
        super().__init__(
            detail=f"Not allowed to access photo {photo_id}"
            if photo_id is not None
            else None,
            photo_id=photo_id,
        )


class ImageUploadFailedError(PhotoError):
    status_code = 502
    default_detail = "Image upload failed"

    def __init__(self, reason: str = None):
        super().__init__(
            detail=f"Image upload failed: {reason}" if reason else None,
            reason=reason,
        )


class PhotoReorderValidationError(PhotoError):
    status_code = 400
    default_detail = "La lista de fotos no coincide con las fotos del perfil"

    def __init__(self):
        super().__init__()


class PhotoLimitReachedError(PhotoError):
    status_code = 409
    code = "PHOTO_LIMIT_REACHED"
    default_detail = "Has alcanzado el máximo de fotos del perfil"


class PhotoOrderConflictError(PhotoError):
    status_code = 409
    default_detail = "Ya existe una foto en esa posición"

    def __init__(self, order: int = None):
        super().__init__(
            detail=f"Ya existe una foto con el orden {order}"
            if order is not None
            else None,
            order=order,
        )

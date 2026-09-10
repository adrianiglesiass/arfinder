from app.core.exceptions.base import AppError


class UserError(AppError):
    pass


class UserNotFoundError(UserError):
    status_code = 404
    default_detail = "Usuario no encontrado"

    def __init__(self, user_id: int = None):
        super().__init__(
            detail=f"Usuario con id {user_id} no encontrado"
            if user_id is not None
            else None,
            user_id=user_id,
        )

from app.core.exceptions.base import AppError


class BlockError(AppError):
    pass


class BlockAlreadyExistsError(BlockError):
    status_code = 409
    code = "USER_BLOCK_ALREADY_EXISTS"
    default_detail = "Este usuario ya está bloqueado"


class BlockSelfError(BlockError):
    status_code = 400
    code = "CANNOT_BLOCK_SELF"
    default_detail = "No puedes bloquear tu propio perfil"

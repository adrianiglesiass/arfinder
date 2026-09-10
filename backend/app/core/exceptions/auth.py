from app.core.exceptions.base import AppError


class AuthError(AppError):
    pass


class EmailAlreadyRegisteredError(AuthError):
    status_code = 409
    code = "EMAIL_ALREADY_REGISTERED"
    default_detail = "Email already registered"

    def __init__(self, email: str = None):
        super().__init__(
            detail=f"Email '{email}' is already registered" if email else None,
            email=email,
        )


class InvalidCredentialsError(AuthError):
    status_code = 401
    code = "INVALID_CREDENTIALS"
    default_detail = "Invalid email or password"


class AccountDeletionError(AuthError):
    status_code = 502
    code = "ACCOUNT_DELETION_FAILED"
    default_detail = "No se pudo eliminar la cuenta en el proveedor externo"

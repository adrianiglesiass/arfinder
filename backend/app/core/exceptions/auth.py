from app.core.exceptions.base import AppError


class AuthError(AppError):
    pass


class EmailAlreadyRegisteredError(AuthError):
    status_code = 409
    default_detail = "Email already registered"

    def __init__(self, email: str = None):
        super().__init__(
            detail=f"Email '{email}' is already registered" if email else None,
            email=email,
        )


class InvalidCredentialsError(AuthError):
    status_code = 401
    default_detail = "Invalid email or password"

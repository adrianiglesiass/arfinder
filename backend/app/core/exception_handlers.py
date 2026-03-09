from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions.auth import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.exceptions.profile import ProfileNotFoundError, ProfileAlreadyExistsError
from app.exceptions.photo import PhotoAccessDeniedError, ImageUploadFailedError


async def email_already_registered_handler(
    request: Request, exc: EmailAlreadyRegisteredError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": f"Email {exc.email} is already registered"},
    )


async def invalid_credentials_handler(
    request: Request, exc: InvalidCredentialsError
) -> JSONResponse:
    return JSONResponse(
        status_code=401, content={"detail": "Invalid email or password"}
    )


async def profile_not_found_handler(
    request: Request, exc: ProfileNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"detail": f"Profile not found for user {exc.user_id}"},
    )


async def profile_already_exists_handler(
    request: Request, exc: ProfileAlreadyExistsError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": f"Profile already exists for user {exc.user_id}"},
    )


async def photo_access_denied_handler(
    request: Request, exc: PhotoAccessDeniedError
) -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={
            "detail": f"User {exc.user_id} does not have access to photo {exc.photo_id}"
        },
    )


async def image_upload_failed_handler(
    request: Request, exc: ImageUploadFailedError
) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": exc.reason})


def register_exception_handlers(app):
    app.add_exception_handler(
        EmailAlreadyRegisteredError, email_already_registered_handler
    )
    app.add_exception_handler(InvalidCredentialsError, invalid_credentials_handler)
    app.add_exception_handler(ProfileNotFoundError, profile_not_found_handler)
    app.add_exception_handler(ProfileAlreadyExistsError, profile_already_exists_handler)
    app.add_exception_handler(PhotoAccessDeniedError, photo_access_denied_handler)
    app.add_exception_handler(ImageUploadFailedError, image_upload_failed_handler)

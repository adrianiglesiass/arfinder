from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.exceptions.base import AppError


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


def register_exception_handlers(app):
    app.add_exception_handler(AppError, app_error_handler)

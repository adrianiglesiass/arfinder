from fastapi.exceptions import RequestValidationError
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.exceptions.base import AppError


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):

    errors = []
    for err in exc.errors():
        msg = err["msg"].replace("Value error, ", "")
        field = str(err["loc"][-1])

        errors.append({"field": field, "message": msg})

    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )


def register_exception_handlers(app):
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

from fastapi.exceptions import RequestValidationError
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.exceptions.base import AppError


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "detail": exc.detail},
    )


PYDANTIC_MESSAGES = {
    "greater_than_equal": "debe ser mayor o igual a {ge}",
    "less_than_equal": "debe ser menor o igual a {le}",
    "greater_than": "debe ser mayor a {gt}",
    "less_than": "debe ser menor a {lt}",
    "string_too_long": "no puede tener más de {max_length} caracteres",
    "string_too_short": "debe tener al menos {min_length} caracteres",
    "value_error.missing": "es un campo obligatorio",
    "missing": "es un campo obligatorio",
    "type_error.integer": "debe ser un número entero",
    "integer_parsing": "debe ser un número entero",
    "value_error.email": "debe ser un correo electrónico válido",
    "value_error.number.not_ge": "debe ser mayor o igual a {ge}",
    "enum": "debe ser uno de: {expected}",
}

FIELD_NAMES = {
    "age": "La edad",
    "name": "El nombre",
    "city": "La ciudad",
    "bio": "La biografía",
    "max_budget": "El presupuesto máximo",
    "room_description": "La descripción de la habitación",
    "gender": "El género",
    "available_from": "La fecha de disponibilidad",
    "type": "El tipo de perfil",
    "has_pets": "Las mascotas",
    "is_smoker": "El hábito de fumar",
    "schedule": "El horario",
}


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        error_type = error.get("type")
        field = error.get("loc")[-1]

        translated_field = FIELD_NAMES.get(field, field)

        msg_template = PYDANTIC_MESSAGES.get(error_type)
        if msg_template:
            ctx = error.get("ctx", {})
            try:
                new_msg = f"{translated_field} {msg_template.format(**ctx)}"
            except (KeyError, ValueError):
                new_msg = f"{translated_field}: {error.get('msg')}"
        else:
            new_msg = f"{translated_field}: {error.get('msg')}"

        error["msg"] = new_msg
        errors.append(error)

    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )


def register_exception_handlers(app):
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

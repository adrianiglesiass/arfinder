from app.core.exceptions.base import AppError


class CitySearchUnavailableError(AppError):
    status_code = 503
    default_detail = "City search service is temporarily unavailable"

from app.core.exceptions.base import AppError


class ReportError(AppError):
    pass


class ReportAlreadyExistsError(ReportError):
    status_code = 409
    code = "USER_REPORT_ALREADY_EXISTS"
    default_detail = "Ya has reportado a este usuario"


class ReportSelfError(ReportError):
    status_code = 400
    code = "CANNOT_REPORT_SELF"
    default_detail = "No puedes reportar tu propio perfil"

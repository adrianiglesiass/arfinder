from app.core.exceptions.base import AppError


class TooManySocketsError(AppError):
    """Se superó el techo de conexiones WebSocket por usuario o por IP."""

    status_code = 429
    default_detail = (
        "Demasiadas conexiones en tiempo real. "
        "Cierra alguna pestaña e inténtalo de nuevo en unos segundos."
    )

    def __init__(self):
        super().__init__()

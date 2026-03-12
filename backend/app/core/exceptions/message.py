from app.core.exceptions.base import AppError


class MessageError(AppError):
    pass


class MessageNotFoundError(MessageError):
    status_code = 404
    default_detail = "Message not found"

    def __init__(self, message_id: int = None):
        super().__init__(
            detail=f"Message {message_id} not found"
            if message_id is not None
            else None,
            message_id=message_id,
        )


class MessageAccessDeniedError(MessageError):
    status_code = 403
    default_detail = "Not allowed to access this message"

    def __init__(self, message_id: int = None):
        super().__init__(
            detail=f"Not allowed to access message {message_id}"
            if message_id is not None
            else None,
            message_id=message_id,
        )

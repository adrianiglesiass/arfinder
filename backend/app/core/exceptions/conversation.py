from app.core.exceptions.base import AppError


class ConversationNotFoundError(AppError):
    status_code = 404
    default_detail = "Conversation not found"

    def __init__(self):
        super().__init__()


class ConversationAccessDeniedError(AppError):
    status_code = 403
    default_detail = "Access to this conversation is denied"

    def __init__(self):
        super().__init__()


class CannotMessageYourselfError(AppError):
    status_code = 400
    default_detail = "Cannot start a conversation with yourself"

    def __init__(self):
        super().__init__()

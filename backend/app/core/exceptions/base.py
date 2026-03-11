class AppError(Exception):
    status_code: int = 500
    default_detail: str = "An unexpected error occurred"

    def __init__(self, detail: str = None, **context):
        self.detail = detail or self.default_detail
        self.context = context
        super().__init__(self.detail)

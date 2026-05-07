import re


class AppError(Exception):
    status_code: int = 500
    default_detail: str = "An unexpected error occurred"
    code: str | None = None

    def __init__(self, detail: str = None, code: str | None = None, **context):
        self.detail = detail or self.default_detail
        self.context = context

        if code is not None:
            self.code = code
        else:
            cls_code = getattr(self.__class__, "code", None)
            if cls_code:
                self.code = cls_code
            else:
                self.code = self._derive_code_from_class_name(self.__class__.__name__)

        super().__init__(self.detail)

    @staticmethod
    def _derive_code_from_class_name(name: str) -> str:
        if name.endswith("Error"):
            name = name[:-5]
        s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
        snake = re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1)
        return snake.upper()

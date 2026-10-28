from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

HSTS_VALUE = "max-age=31536000; includeSubDomains"

BASE_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}


class SecurityHeadersMiddleware:
    """Add baseline security headers to every HTTP response.

    HSTS is skipped in development so local plain-HTTP setups keep working.
    Existing headers set by a route are never overwritten.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in BASE_SECURITY_HEADERS.items():
                    headers.setdefault(name, value)
                if settings.ENVIRONMENT != "development":
                    headers.setdefault("Strict-Transport-Security", HSTS_VALUE)
            await send(message)

        await self.app(scope, receive, send_with_headers)

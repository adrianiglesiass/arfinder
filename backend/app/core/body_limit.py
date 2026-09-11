import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send

PHOTO_UPLOAD_MAX_BYTES = 11 * 1024 * 1024


class _BodyTooLarge(Exception):
    pass


class BodySizeLimitMiddleware:
    def __init__(
        self, app: ASGIApp, max_bytes: int, routes: set[tuple[str, str]]
    ) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.routes = routes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or (scope["method"], scope["path"]) not in self.routes
        ):
            await self.app(scope, receive, send)
            return

        declared = dict(scope["headers"]).get(b"content-length")
        if (
            declared is not None
            and declared.isdigit()
            and int(declared) > self.max_bytes
        ):
            await self._reject(send)
            return

        received = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLarge()
            return message

        async def tracking_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except _BodyTooLarge:
            if not response_started:
                await self._reject(send)

    async def _reject(self, send: Send) -> None:
        body = json.dumps(
            {
                "code": "PAYLOAD_TOO_LARGE",
                "detail": "El archivo supera el tamaño máximo permitido",
            }
        ).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

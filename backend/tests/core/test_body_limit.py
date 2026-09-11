from fastapi import FastAPI, File, Request, UploadFile
from fastapi.testclient import TestClient

from app.core.body_limit import BodySizeLimitMiddleware

LIMIT = 1024


def _client() -> TestClient:
    app = FastAPI()
    app.add_middleware(
        BodySizeLimitMiddleware,
        max_bytes=LIMIT,
        routes={("POST", "/upload"), ("POST", "/photo")},
    )

    @app.post("/upload")
    async def upload(request: Request):
        return {"size": len(await request.body())}

    @app.post("/photo")
    async def photo(file: UploadFile = File(...)):
        return {"name": file.filename}

    @app.post("/other")
    async def other(request: Request):
        return {"size": len(await request.body())}

    return TestClient(app)


def test_rejects_declared_content_length_over_the_limit():
    res = _client().post("/upload", content=b"x" * (LIMIT + 1))

    assert res.status_code == 413
    assert res.json()["code"] == "PAYLOAD_TOO_LARGE"


def test_rejects_streamed_body_without_content_length():
    def chunks():
        for _ in range(4):
            yield b"x" * 512

    res = _client().post("/upload", content=chunks())

    assert res.status_code == 413


def test_accepts_body_within_the_limit():
    res = _client().post("/upload", content=b"x" * LIMIT)

    assert res.status_code == 200
    assert res.json() == {"size": LIMIT}


def test_other_routes_are_not_limited():
    res = _client().post("/other", content=b"x" * (LIMIT * 4))

    assert res.status_code == 200


def test_streamed_multipart_over_the_limit_returns_413_not_400():
    boundary = "limite"
    crlf = "\r\n"
    head = (
        f"--{boundary}{crlf}"
        f'Content-Disposition: form-data; name="file"; filename="a.png"{crlf}'
        f"Content-Type: image/png{crlf}{crlf}"
    ).encode()
    tail = f"{crlf}--{boundary}--{crlf}".encode()

    def chunks():
        yield head
        for _ in range(4):
            yield b"x" * 512
        yield tail

    res = _client().post(
        "/photo",
        content=chunks(),
        headers={"content-type": f"multipart/form-data; boundary={boundary}"},
    )

    assert res.status_code == 413

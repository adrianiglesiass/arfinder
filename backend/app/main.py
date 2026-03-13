from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router
from app.routes.messages import router as messages_router
from app.routes.profile import router as profile_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Arfinder API documentation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(messages_router)
app.include_router(conversations_router)


@app.get("/")
def root():
    return {"message": "Welcome to Arfinder API!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

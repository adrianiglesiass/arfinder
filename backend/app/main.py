from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.realtime import listener as realtime_listener
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router
from app.routes.messages import router as messages_router
from app.routes.profile import router as profile_router
from app.routes.cities import router as cities_router
from app.routes.realtime import router as realtime_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production" and settings.DEBUG:
        raise RuntimeError("DEBUG mode must be disabled in production environment")
    await realtime_listener.start()
    yield
    await realtime_listener.stop()


app = FastAPI(
    title=settings.APP_NAME,
    description="Arfinder API documentation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://0.0.0.0:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(messages_router)
app.include_router(conversations_router)
app.include_router(cities_router)
app.include_router(realtime_router)


@app.get("/")
def root():
    return {"message": "Welcome to Arfinder API!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

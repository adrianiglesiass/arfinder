from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.realtime import listener as realtime_listener
from app.core.security_headers import SecurityHeadersMiddleware
from app.services import city_service
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router
from app.routes.messages import router as messages_router
from app.routes.profile import router as profile_router
from app.routes.cities import router as cities_router
from app.routes.realtime import router as realtime_router
from app.core.body_limit import PHOTO_UPLOAD_MAX_BYTES, BodySizeLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production" and settings.DEBUG:
        raise RuntimeError("DEBUG mode must be disabled in production environment")
    await realtime_listener.start()
    city_service.load_cities()
    await city_service.start_http_client()
    yield
    await city_service.stop_http_client()
    await realtime_listener.stop()


def create_app() -> FastAPI:
    """Fábrica de la aplicación.

    En producción se deshabilitan `/docs`, `/redoc` y `/openapi.json` para no
    exponer el contrato completo de la API al exterior (spec #57).
    """
    production = settings.ENVIRONMENT == "production"
    application = FastAPI(
        title=settings.APP_NAME,
        description="Arfinder API documentation",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
        openapi_url=None if production else "/openapi.json",
    )

    application.add_middleware(
        BodySizeLimitMiddleware,
        max_bytes=PHOTO_UPLOAD_MAX_BYTES,
        routes={("POST", "/profiles/me/photos")},
    )
    application.add_middleware(GZipMiddleware, minimum_size=500)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    # Added last so it is the outermost layer and also covers CORS preflight responses.
    application.add_middleware(SecurityHeadersMiddleware)

    register_exception_handlers(application)

    application.include_router(auth_router)
    application.include_router(profile_router)
    application.include_router(messages_router)
    application.include_router(conversations_router)
    application.include_router(cities_router)
    application.include_router(realtime_router)

    @application.get("/")
    def root():
        return {"message": "Welcome to Arfinder API!"}

    @application.get("/health")
    def health_check():
        return {"status": "ok"}

    return application


app = create_app()

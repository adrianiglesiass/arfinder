from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import User, Profile, Conversation, Message
from app.routes.auth import router as auth_router
from app.routes import profile, auth
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=os.getenv("APP_NAME", "Arfinder"),
    description="Arfinder API documentation",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile.router)


@app.get("/")
def root():
    return {"message": "Welcome to Arfinder API!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db-test")
def db_test():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
        return {"db_test": 'connected'}

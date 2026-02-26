from uvicorn import run
from app.main import app

if __name__ == "__main__":
    run("app.main:app", reload=True)

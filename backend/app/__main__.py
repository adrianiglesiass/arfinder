from uvicorn import run

if __name__ == "__main__":
    run("app.main:app", reload=True)

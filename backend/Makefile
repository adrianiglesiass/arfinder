# Detección de Sistema Operativo
ifeq ($(OS),Windows_NT)
    VENV_BIN = .venv/Scripts
    PYTHON = $(VENV_BIN)/python.exe
    PIP = $(VENV_BIN)/pip.exe
    ALEMBIC = $(VENV_BIN)/alembic.exe
    UVICORN = $(VENV_BIN)/uvicorn.exe
    PYTEST = $(VENV_BIN)/pytest.exe
else
    VENV_BIN = .venv/bin
    PYTHON = $(VENV_BIN)/python
    PIP = $(VENV_BIN)/pip
    ALEMBIC = $(VENV_BIN)/alembic
    UVICORN = $(VENV_BIN)/uvicorn
    PYTEST = $(VENV_BIN)/pytest
endif

.PHONY: install lint format test migrate seed ci clean db-up db-down db-reset dev help

install:
	$(PIP) install -r requirements.txt

lint:
	$(PYTHON) -m ruff check .

format:
	$(PYTHON) -m ruff format .

test:
	PYTHONPATH=. $(PYTEST) tests/ -v

test-unit:
	PYTHONPATH=. $(PYTEST) tests/test_fuzzing.py -n auto -v

test-fuzz:
	.venv/bin/schemathesis run http://localhost:8000/openapi.json --checks all

migrate:
	PYTHONPATH=. $(ALEMBIC) upgrade head

seed:
	@echo "Añadiendo datos de prueba..."
	PYTHONPATH=. $(PYTHON) scripts/seed.py

ci: install lint test

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

db-up:
	docker compose up -d

db-down:
	docker compose down

db-reset:
	docker compose down -v

dev: db-up migrate seed
	PYTHONPATH=. $(UVICORN) app.main:app --reload


.PHONY: install lint format test migrate ci clean db-up db-down db-reset dev help

install:
	pip install -r requirements.txt

lint:
	ruff check app/ tests/ alembic/

format:
	ruff format app/ tests/ alembic/

test:
	pytest tests/ -v

migrate:
	PYTHONPATH=. .venv/Scripts/alembic upgrade head

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

dev: db-up migrate
	.venv/Scripts/uvicorn app.main:app --reload

help:
	@echo "Available targets:"
	@echo "  install   - Install Python dependencies"
	@echo "  lint      - Run ruff linter on app/ and tests/"
	@echo "  format    - Auto-format code with ruff"
	@echo "  test      - Run pytest test suite"
	@echo "  migrate   - Run alembic migrations"
	@echo "  ci        - Run full CI pipeline (install, lint, test)"
	@echo "  clean     - Remove cache files and artifacts"
	@echo "  db-up     - Start database containers"
	@echo "  db-down   - Stop database containers"
	@echo "  db-reset  - Stop containers and delete all data"
	@echo "  dev       - Start databases, run migrations and launch the app"
	@echo "  help      - Show this help message"
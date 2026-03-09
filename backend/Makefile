.PHONY: install lint format test migrate ci clean

install:
	pip install -r requirements.txt

lint:
	ruff check app/ tests/

format:
	ruff format app/ tests/

test:
	pytest tests/ -v

migrate:
	alembic upgrade head

ci: install lint test

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

help:
	@echo "Available targets:"
	@echo "  install  - Install Python dependencies"
	@echo "  lint     - Run ruff linter on app/ and tests/"
	@echo "  format   - Auto-format code with ruff"
	@echo "  test     - Run pytest test suite"
	@echo "  migrate  - Run alembic migrations"
	@echo "  ci       - Run full CI pipeline (install, lint, test)"
	@echo "  clean    - Remove cache files and artifacts"
	@echo "  help     - Show this help message"

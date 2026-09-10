---
tag: SPECS/2026-09-fix-env-postgresql
estado: done
stack: backend
fecha: 2026-09-10
---

# fix-env-postgresql

## Contexto
Los ficheros `.env.example` y `.env.test` apuntan a MySQL (`mysql+pymysql://`), pero todo el código asume PostgreSQL 15: `pg_advisory_xact_lock`, `pg_notify`, triggers Alembic, y `docker-compose.yml` levanta Postgres.

## Problema
Copiar `.env.example` da un driver pymysql inexistente. `conftest.py` instancia `settings` antes de `load_dotenv(".env.test")`, por lo que el engine de test apunta a la BD de desarrollo.

## Alcance
- Corregir `.env.example` y `.env.test` a `postgresql+psycopg2://`.
- Corregir `conftest.py`: instanciar engine de test con URL explícita de test, no con `settings.DATABASE_URL`.

## No-goals
- No se toca `docker-compose.yml` ni la config de CI (ya son correctos).

## Criterios de aceptación
- DADO un clon limpio, CUANDO se ejecuta `cp .env.example .env && make dev`, ENTONCES el backend arranca sin errores de driver.
- DADO `docker compose up -d db-test`, CUANDO se ejecuta `pytest`, ENTONCES los tests corren contra el contenedor de test (puerto 5433).

## Checklist de verificación
- [x] `ruff check .`
- [x] `ruff format --check .`

## Resultado
Corregidos `.env.example`, `.env.test` y `conftest.py`.

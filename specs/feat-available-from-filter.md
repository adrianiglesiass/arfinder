---
tag: SPECS/2026-09-feat-available-from-filter
estado: done
stack: ambos
fecha: 2026-09-10
---

# feat-available-from-filter

## Contexto
- El perfil ya tiene `available_from: Date | None` (`backend/app/models/profile.py:35`,
  `schemas/profile.py`), editable en el formulario ("Disponible desde") y mostrado en el perfil público.
- La búsqueda de perfiles (`GET /profiles`) **no** filtra por este campo: no se puede buscar
  "perfiles disponibles desde una fecha".
- La búsqueda ya soporta `gender`, `age_min`, `age_max`, `budget_max`, etc. con el patrón
  Router → Service → Repository (spec `feat-age-gender-filters`).

## Problema
Un usuarix no puede filtrar explorar por fecha de disponibilidad aunque los perfiles la declaran,
así que no puede acotar resultados por cuándo estarán listos el piso o la persona.

## Alcance
- **Backend**: nuevo query param `available_from: date | None` en `GET /profiles`; filtro
  `Profile.available_from IS NULL OR Profile.available_from <= available_from`.
- **Frontend contrato**: regenerar `api.types.ts` (`npm run generate:types`) para que
  `ProfileSearchFilters` incluya `available_from`.
- **Frontend estado/URL**: `ProfileSearchService` lee/escribe `available_from` en la URL.
- **Frontend UI**: campo de fecha "Disponible desde" en el panel de filtros de `/explorar`
  (mismo patrón visual que el resto del panel y que el formulario de perfil).
- **Frontend chips activos**: mostrar chip "Disponible desde {fecha}" y permitir quitarlo.
- Tests backend + frontend.

## No-goals
- NO cambiar el contrato de respuesta (`ProfileSummary` no añade campos).
- NO añadir rango de disponibilidad (solo "desde una fecha").
- NO tocar el formulario de perfil ni la pantalla de detalle.
- NO cambiar el modelo/schema de perfil ni migraciones.

## Criterios de aceptación
- DADO `GET /profiles?available_from=2026-10-01` CUANDO un perfil tiene `available_from <= 2026-10-01`
  O `available_from IS NULL` ENTONCES ese perfil aparece en los resultados.
- DADO el mismo endpoint CUANDO un perfil tiene `available_from > 2026-10-01` ENTONCES NO aparece.
- DADO el endpoint SIN `available_from` CUANDO se consulta ENTONCES no aplica filtro de disponibilidad
  (comportamiento actual).
- DADO el usuarix en `/explorar` CUANDO elige una fecha "Disponible desde"
  ENTONCES `filters().available_from` se actualiza, la URL gana `available_from=<fecha>` y se refresca la búsqueda.
- DADO el usuarix CUANDO borra la fecha ENTONCES el filtro desaparece de los filtros y de la URL.
- DADO el usuarix con el filtro activo CUANDO ve los chips ENTONCES aparece "Disponible desde {fecha}"
  y al pulsarlo quita el filtro.

## Decisión técnica
- **Semántica del filtro (back/repo)**: `(Profile.available_from IS NULL) | (Profile.available_from <= D)`.
  Incluir `NULL` evita ocultar perfiles sin fecha declarada (equivalen a "disponible ya/sin especificar").
  Alternativa descartada: `<= D` estricto (rompería la búsqueda para perfiles sin fecha).
- Cada capa añade un parámetro: `routes/profile.py` (`Query(None)`, tipo `date` de `datetime`) →
  `profile_service.search_profiles` → `profile_repository.search_profiles` (filtro SQLAlchemy).
- Generación de tipos: `npm run generate:types` con el OpenAPI del backend local (dump de
  `app.openapi()` con envs placeholder → `npx openapi-typescript`). NO editar `api.types.ts` a mano.
- UI de fecha: `<input type="date" pInputText>` idéntico al del formulario de perfil
  (`step-profile.html`), con `[ngModel]="availableFrom()"` + `(ngModelChange)="setAvailableFrom($event)"`.
  Al vaciarlo PrimeNG/html emite `''` → `updateFilter('available_from', '')` elimina la clave
  (el service ya borra los strings vacíos).
- Estado/URL: en `ProfileSearchService.readFromUrl` leer `available_from` (string) y en
  `writeToUrl` apendeado; sin conversión de fecha (el API acepta string ISO `YYYY-MM-DD`).
- Chips: en `search-profile.ts` añadir chip con `label` = fecha formateada en `es-ES`
  ("10 de octubre de 2026", reutilizando el formato de `ProfileInfoBlock`); `removeFilter` ya borra
  por clave genérica.

## Plan de tests
Backend (`tests/profiles/test_search.py`, patrón `client` + `create_profile`):
- `test_search_available_from_filters_by_date`: 3 perfiles (pasado `2026-09-01`, None, futuro `2026-12-01`);
  `GET /profiles?available_from=2026-10-01` devuelve pasado + None y NO el futuro.
- `test_search_available_from_includes_exact_date`: perfil con `available_from == D` aparece.
- `test_search_without_available_from_returns_all`: sin el param, sin filtro.

Frontend:
- `search-filters.spec.ts`: `setAvailableFrom('2026-10-01')` → `updateFilter('available_from','2026-10-01')`;
  `setAvailableFrom('')` → `updateFilter('available_from', null)` (el service borra clave y URL en ambos casos).
- `profile-search.service.spec.ts` (nuevo): `readFromUrl`/`writeToUrl` — opcional; se cubrirá si es
  de bajo coste; caso mínimo: la URL `?available_from=2026-10-01` se refleja en `filters()`.

## Checklist de verificación
- [ ] Backend: `ruff check .` y `ruff format --check .`
- [ ] Backend: `pytest --tb=short` (override `DATABASE_URL` a compose `db-test`)
- [ ] Frontend: `npm run format:check`, `npm run lint`, `npm run test:ci`
- [ ] Frontend: build producción (`npx ng build --configuration production`)
- [ ] `npm run generate:types` ejecutado; confirmar `api.types.ts` con `available_from` en query de search

## Resultado
- Backend (`GET /profiles`): nuevo query param `available_from: date | None` (Router → Service → Repository);
  filtro `Profile.available_from IS NULL OR Profile.available_from <= D`. Respuesta y no-goals intactos.
- Contrato: `api.types.ts` regenerado con `npm run generate:types` (OpenAPI dev dump → openapi-typescript
  7.13.0 → Prettier). `ProfileSearchFilters` incluye `available_from?: string | null`; se incorporaron además
  dos rutas que faltaban del contrato real (`/cities/search/extended`, `/health/realtime`).
- Frontend: `ProfileSearchService.readFromUrl`/`writeToUrl` con `available_from`; campo de fecha
  "Disponible desde" en el panel de filtros (`<input type="date" pInputText>`, patrón de `step-profile`);
  chip activo "Disponible desde {fecha}" con guard ante `Invalid Date` (fecha malformada en URL no rompe `/explorar`).
- Tests: backend +3 en `test_search.py` (pasado+NULL incluidos, futuro excluido; fecha exacta; sin param);
  frontend +2 en `search-filters.spec.ts` (setter y borrado) → **17/17**.
- Revisión `code-reviewer` (read-only): **APRUEBO CON COMENTARIOS**, sin bloqueantes; aplicado el comentario 1
  (guard `Invalid Date`); el resto (test de chip, redundancia de un test, nit a11y) se deja documentado o fuera de alcance.
- Verificación: backend `ruff check` ✓ / `ruff format --check` ✓ / pytest **54 passed**; frontend
  `format:check` ✓ / `lint` ✓ / `test:ci` **17 passed** / build producción ✓.
- PR: `feat/available-from-filter` → develop.
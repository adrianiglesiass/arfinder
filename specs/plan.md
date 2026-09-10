---
tag: SPECS/2026-09-plan
estado: in-progress
stack: ambos
fecha: 2026-09-10
---

# Plan de saneamiento y features — Arfinder

> Punto de partida para CUALQUIER agente de IA que retome el flujo. Si esta spec cambia,
> actualízala al terminar cada fase para que el siguiente agente sepa exactamente dónde se quedó.

## Cómo se trabaja aquí
- Norma vinculante: [SDD](spec-driven-development.md) → cada cambio tiene spec en `specs/`.
- Flujo por ramas: cada fase vive en `develop` y se trabaja en `fix/...`/`feat/...`.
  - Rama por fase: `git checkout -b <rama> develop`
  - PR → `develop` (nunca directo), merge solo cuando CI verde y revisado.
  - Después de mergear una fase, las ramas pendientes deben actualizarse a `develop` (`git fetch && git merge --ff-only origin/develop`).
- Convención de ramas: `<tipo>/<descripcion-kebab-case>` (`fix`, `feat`, `chore`, `docs`, `revert`, `refactor`).
- Commits: Conventional Commits `tipo(scope?): descripción (#PR)` (nombre de la PR de milestone).
- Verificación: Sección 6 de la spec SDD (backend: ruff + pytest; frontend: format/lint/test/build).
- NO tocar cambios locales sin commitear del usuario (working tree sucio puede contener trabajo personal).

## Hallazgos del backlog (auditoría)

| # | Hallazgo | Área | Fase | Estado |
|---|---|---|---|---|
| 1 | `.env.example`/`.env.test` apuntaban a MySQL | backend | critical | ✅ done (#288) |
| 2 | `conftest.py` arriesgaba la BD de dev y forzaba URL de test | backend | critical | ✅ done (#288) |
| 3 | `delete_user` borraba InsForge delante del borrado local | backend | critical | ✅ done (#288) |
| 4 | fotos pendientes en `localStorage` nunca se limpiaban | frontend | critical | ✅ done (#288) |
| 5 | onboarding guard sobrescribía perfil existente | frontend | critical | ✅ done (#288) |
| 6 | carrera en `get_or_create_conversation` + validar `other_user_id` | backend | backend-bugs | ✅ done (#289) |
| 7 | `reorder_photos` sin advisory lock + ids sin validar | backend | backend-bugs | ✅ done (#289) |
| 8 | `order` sin `ge=0` y colisión 500 → 409 | backend | backend-bugs | ✅ done (#289) |
| 9 | `POST /conversations` con `last_message`/`unread_count` falsos | backend | backend-bugs | ✅ done (#289) |
| 10 | `limit` negativo sin validar | backend | backend-bugs | ✅ done (#289) |
| 11 | rutas `async def` con SQL síncrono | backend | backend-bugs | ✅ done (#289) |
| 12 | sin `cloudinary.destroy` al borrar fotos/perfil/usuario | backend | backend-bugs | ✅ done (#289) |
| 13 | email-takeover borraba el perfil local | backend | backend-bugs | ✅ done (#289) |
| 14 | `POST /conversations` sin emitir `conversation_created` | backend | backend-bugs | ✅ done (#289) |
| 15 | Pendientes de auditoría frontend (re-auditar) | frontend | frontend-bugs | ✅ done (#290) |
| T | Arquitectura: router de conversaciones inflado, duplicación, capas | backend | architecture-cleanup | ✅ done (#291) |
| F1 | Filtro de edad + género en búsqueda | frontend+backend | feature | ⏳ pendiente |
| F2 | Filtro "disponible desde" | frontend+backend | feature | ⏳ pendiente |
| F3 | Favoritos | frontend+backend | feature | ⏳ pendiente |
| F4 | Bloqueo de usuarios | frontend+backend | feature | ⏳ pendiente |
| F5 | Reportes de usuarios | frontend+backend | feature | ⏳ pendiente |

## Fases (orden de ejecución)
1. ✅ **fix/critical-issues** → PR #288 (mergeado).
2. ✅ **fix/backend-bugs** → PR #289 (mergeado).
3. ✅ **fix/frontend-bugs** → PR #290 (mergeado).
4. ⏳ **refactor/architecture-cleanup** — router de conversaciones, reutilización, capas. RAMA ACTUAL → PR #291.
5. ⏳ **feat/age-gender-filters**, **feat/available-from-filter**, **feat/favorites**, **feat/user-block**, **feat/reports**.

## Estado de la rama actual (refactor/architecture-cleanup)
- Base: `develop` (incluye #288, #289 y #290).
- Implementación completa: router de conversaciones delgado + response-mapping/was_new en
  `conversation_service.py` + tests. Spec `specs/refactor-conversations-layering.md` en `done`.
- Verificación local: `ruff check` ✓, `ruff format --check` ✓, pytest **51 passed**
  (override `DATABASE_URL` a compose `db-test` — `arfinder_test_user:TVprI5Ipni4KNQzDOewAOHkKBI0965CJ@localhost:5433/arfinder_test_db`).
- Ambiente local: Postgres de dev en 5432; test en 5433 vía `docker compose up -d db-test`
  (credenciales de conftest y compose difieren → override `DATABASE_URL` al correr pytest).
- Realtime/CI: `gh` CLI en `C:\Program Files\GitHub CLI\gh.exe`; en Windows usar `--body-file <archivo>` para el body de PR.

## Commits de referencia
- `#288 incluyó`: conftest fix de CI + fixes críticos #1-#5.
- `#289 incluyó`: fixes #6-#14 (4 commits + specs done).
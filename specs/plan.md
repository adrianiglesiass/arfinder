---
tag: SPECS/2026-09-plan
estado: done
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
| F1 | Filtro de edad + género en búsqueda | frontend+backend | feature | ✅ done → PR #292 (mergeado) |
| F2 | Filtro "disponible desde" | frontend+backend | feature | ✅ done → PR #293 (mergeado) |
| F3 | Favoritos | frontend+backend | feature | ✅ done → PR #294 (mergeado) |
| F4 | Bloqueo de usuarios | frontend+backend | feature | ✅ done → PR #295 (mergeado) |
| F5 | Reportes de usuarios | frontend+backend | feature | ✅ done → PR #296 (mergeado) |

## Fases (orden de ejecución)
1. ✅ **fix/critical-issues** → PR #288 (mergeado).
2. ✅ **fix/backend-bugs** → PR #289 (mergeado).
3. ✅ **fix/frontend-bugs** → PR #290 (mergeado).
4. ✅ **refactor/architecture-cleanup** → PR #291 (mergeado).
5. ✅ **feat/age-gender-filters** → PR #292 (mergeado).
6. ✅ **feat/available-from-filter** → PR #293 (mergeado).
7. ✅ **feat/favorites** → PR #294 (mergeado).
8. ✅ **feat/user-block** → PR #295 (mergeado).
9. ✅ **feat/reports** → PR #296 (mergeado). Última fase del backlog.

## Estado del backlog
- **Backlog completo**: los 15 hallazgos de auditoría, el saneamiento de arquitectura y las 5
  features (F1–F5) están mergeados en `develop` (#288–#296). No queda trabajo planificado.
- `develop` está por delante de `main`. La release se hace por PR `develop` → `main` + tag, según
  el flujo de ramas del proyecto; queda pendiente de decisión del equipo, no es parte de F5.
- Siguientes candidatos naturales (sin spec, no comprometidos): panel de moderación para los
  reportes de F5 (hoy solo consultables por SQL, requiere concepto de admin en `User`) y gating de
  mensajería para bloqueados, que F4 dejó explícitamente como no-goal.

## Entorno local (LEER antes de verificar)
- Postgres de dev en 5432 y de test en 5433 (`docker compose up -d db-test` desde `backend/`).
- **Las credenciales de `conftest.py` y de `docker-compose.yml` NO coinciden**: hay que sobrescribir
  `DATABASE_URL` al correr pytest, o todos los tests fallan con `password authentication failed`:
  ```bash
  DATABASE_URL="postgresql+psycopg2://arfinder_test_user:<POSTGRES_PASSWORD de db-test>@localhost:5433/arfinder_test_db"     PYTHONPATH=. .venv/Scripts/python.exe -m pytest tests/ -q
  ```
- El `.env` de dev apunta a MySQL → **no usarlo para alembic**. Para validar migraciones, crear una
  DB temporal en el Postgres de test y pasarle `DATABASE_URL` + el resto de vars obligatorias
  (`SECRET_KEY`, `ALGORITHM`, `INSFORGE_URL`, `INSFORGE_API_KEY`, `OSS_HOST`, `CLOUDINARY_*`,
  `NOMINATIM_USER_AGENT`) por entorno.
- `gh` CLI en `C:\Program Files\GitHub CLI\gh.exe`; en Windows usar `--body-file <archivo>` para
  el body de la PR.
- Commits **sin trailer `Co-Authored-By`**.

## Commits de referencia
- `#288 incluyó`: conftest fix de CI + fixes críticos #1-#5.
- `#289 incluyó`: fixes #6-#14 (4 commits + specs done).
- `#295 incluyó`: F4 bloqueo de usuarios (backend + frontend) y las 6 correcciones de revisión
  registradas en el Resultado de `specs/feat-user-block.md`.
- `#296 incluyó`: F5 reportes de usuarios, que reutiliza `block_service` para bloquear al
  reportado. Ojo con `MessageService` de PrimeNG: es **por componente**, no global.
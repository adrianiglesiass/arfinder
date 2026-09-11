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
| F1 | Filtro de edad + género en búsqueda | frontend+backend | feature | ✅ done → PR #292 (mergeado) |
| F2 | Filtro "disponible desde" | frontend+backend | feature | ✅ done → PR #293 (mergeado) |
| F3 | Favoritos | frontend+backend | feature | ✅ done → PR #294 (mergeado) |
| F4 | Bloqueo de usuarios | frontend+backend | feature | ✅ done → PR #295 (mergeado) |
| F5 | Reportes de usuarios | frontend+backend | feature | ✅ done → PR #296 (mergeado) |
| 16 | Botón de bloquear fuera de estilo y sin feedback en el detalle | frontend | profile-actions-ux | ✅ done → PR #299 |
| 17 | Diálogo de reporte atrapado en la barra móvil (`backdrop-filter`): recortado y sin scroll | frontend | profile-actions-ux | ✅ done → PR #299 |
| 18 | `/bloqueados` inalcanzable en móvil (F4 prometió el menú de usuario y no se hizo) | frontend | profile-actions-ux | ✅ done → PR #299 |
| 19 | La tarjeta pierde el hover al ir al corazón; en el deck el corazón inicia un arrastre | frontend | profile-actions-ux | ✅ done → PR #299 |
| 20 | No se puede marcar favorito desde el detalle de perfil | frontend | profile-actions-ux | ✅ done → PR #299 |
| 21 | Corazón con visitante anónimo: toggle optimista y revert silencioso por 401 | frontend | profile-actions-ux | ✅ done → PR #299 |
| 22 | Rate limit **global** para todo el sitio (un solo bucket) y clave de IP falsificable por `X-Forwarded-For` | backend | prod-critical | ✅ done → PR #300 |
| 23 | Mensajes que superan 8000 bytes en `pg_notify` (emojis, comillas) se pierden con un 500 | backend | prod-critical | ✅ done → PR #300 |
| 24 | El WebSocket retiene una conexión del pool toda su vida; `get_current_user` bloquea el event loop | backend | prod-critical | ✅ done → PR #300 |
| 25 | Un fallo transitorio al refrescar el token (red, 5xx) cierra la sesión para siempre | frontend | prod-critical | ✅ done → PR #300 |
| 26 | Diálogo de reporte colgado si falla la recarga de bloqueados tras reportar (regresión de #299) | frontend | release-blockers | ✅ done → PR #301 |
| 27 | Toast de 400px cortado en móviles de 360px | frontend | release-blockers | ✅ done → PR #301 |
| 28 | Tras bloquear, el corazón sigue marcado y el perfil sigue en la búsqueda ya cargada | frontend | release-blockers | ✅ done → PR #301 |
| 29 | `profile-detail` sin tests de la orquestación de bloqueo y reporte (la spec afirmaba lo contrario) | frontend | release-blockers | ✅ done → PR #301 |
| 30 | El detalle no reinicia su estado al cambiar de `:id` (diálogo abierto reporta al perfil nuevo) | frontend | release-blockers | ✅ done → PR #301 |
| 31 | El banner de la PWA tapa la barra de acciones móvil (misma posición y z-index) | frontend | release-blockers | ✅ done → PR #301 |
| 32 | `name`/`city` de 101–150 caracteres dan 500 (schema 150, columna 100) | backend | backend-integrity | ✅ done → PR #302 |
| 33 | `PATCH /profiles/me` con `null` en campos obligatorios da 500 | backend | backend-integrity | ✅ done → PR #302 |
| 34 | La exclusión por bloqueo en búsqueda y favoritos se corta en 200 usuarios | backend | backend-integrity | ✅ done → PR #302 |
| 35 | Reportar no es atómico: si falla el bloqueo, el reintento da 409 y nunca se bloquea | backend | backend-integrity | ✅ done → PR #302 |
| 36 | Tras borrar la cuenta, la caché de tokens (120 s) recrea el usuario local | backend | backend-integrity | ✅ done → PR #302 |
| 37 | Subida de fotos sin tope de tamaño previo al buffer ni de número de fotos | backend | backend-integrity | ✅ done → PR #302 |
| 38 | Crear conversación, bloquear, reportar y favorito sin rate limit | backend | backend-integrity | ✅ done → PR #302 |
| 39 | `GET /profiles/me/photos` captura `HTTPException` en vez de `ProfileNotFoundError` | backend | backend-integrity | ✅ done → PR #302 |
| 40 | Los filtros de Explorar se pierden al abrir un perfil; el deck vuelve a la tarjeta 1 | frontend | frontend-state | ⏳ |
| 41 | La búsqueda cacheada no reacciona al login/logout (tu propio perfil aparece) | frontend | frontend-state | ⏳ |
| 42 | Las fotos subidas en `/perfil` no aparecen hasta recargar | frontend | frontend-state | ⏳ |
| 43 | Carreras en toggles optimistas (refresh vs toggle, doble toque) y favorito imposible tras desbloquear | frontend | frontend-state | ⏳ |
| 44 | Mensajes: `ngOnInit` sigue tras destruirse; un envío en vuelo se cuela en otra conversación | frontend | frontend-state | ⏳ |
| 45 | Errores silenciados que se muestran como estado vacío o "fin de resultados" | frontend | frontend-state | ⏳ |
| 46 | Diálogos sin gestión de foco ni Escape; diálogo de reporte sin pie fijo | frontend | ux-a11y | ⏳ |
| 47 | El código OTP desborda a 360px | frontend | ux-a11y | ⏳ |
| 48 | Doble envío en el último paso del onboarding | frontend | ux-a11y | ⏳ |
| 49 | Editar perfil: errores de validación invisibles, cambios perdidos sin aviso, borrar foto sin confirmar; `maxlength` de nombre y ciudad | frontend | ux-a11y | ⏳ |
| 50 | Accesibilidad: botón de enviar sin nombre, filtros sin label, foco visible eliminado, deck anidado | frontend | ux-a11y | ⏳ |
| 51 | Textos y consistencia visual (mayúsculas, clases de tema inexistentes, color fijo) | frontend | ux-a11y | ⏳ |
| F6 | El bloqueo corta el chat y el acceso al perfil (hoy el bloqueado puede seguir escribiendo) | frontend+backend | feature | ⏳ |
| 52 | Filtro de presupuesto invertido para quien ofrece habitación | frontend+backend | budget-filter | ⏳ |

## Fases (orden de ejecución)
1. ✅ **fix/critical-issues** → PR #288 (mergeado).
2. ✅ **fix/backend-bugs** → PR #289 (mergeado).
3. ✅ **fix/frontend-bugs** → PR #290 (mergeado).
4. ✅ **refactor/architecture-cleanup** → PR #291 (mergeado).
5. ✅ **feat/age-gender-filters** → PR #292 (mergeado).
6. ✅ **feat/available-from-filter** → PR #293 (mergeado).
7. ✅ **feat/favorites** → PR #294 (mergeado).
8. ✅ **feat/user-block** → PR #295 (mergeado).
9. ✅ **feat/reports** → PR #296 (mergeado).
10. ✅ **fix/profile-actions-ux** → PR #299. Bugs visuales reportados tras la release v1.4.0.
11. ✅ **fix/prod-critical** → PR #300. #22–#25.
12. ✅ **fix/release-blockers** → PR #301. #26–#31.
13. ✅ **fix/backend-integrity** → PR #302. #32–#39.
14. ⏳ **fix/frontend-state** — #40–#45. RAMA SIGUIENTE.
15. ⏳ **fix/ux-a11y** — #46–#51.
16. ⏳ **feat/block-cuts-messaging** — F6.
17. ⏳ **fix/budget-filter-direction** — #52.
18. ⏳ Release (merge commit con `--subject "release: vX.Y.Z"` + tag).

## Estado del backlog
- Release v1.4.0 en `main`. Antes de la siguiente, una auditoría con cinco agentes (code-reviewer,
  ui-ux-reviewer, backend, frontend y producto) dejó la PR #299 **BLOQUEADA** y encontró bugs
  graves ya en producción: hallazgos #22–#52, repartidos en las fases 11–17. Criterio del usuario:
  arreglar **todos los bugs confirmados** antes de subir a `main`.
- Cada hallazgo marcado "reportado" se verifica al escribir su spec; si no se reproduce leyendo el
  código, se descarta y se deja constancia en la spec de su fase.
- Lección de la fase 12: coordinar stores inyectándolos directamente puede crear servicios con efectos
  en su constructor (una búsqueda no pedida). Para avisar de cambios entre stores se usa `BlockEvents`.
- **Revisión obligatoria antes de cada PR** (SDD fase 6): agente con las instrucciones de
  `.opencode/agent/code-reviewer.md`, y `ui-ux-reviewer.md` si toca UI. La PR #299 se saltó este paso.
- Features fuera de esta tanda, por orden: pausar perfil, notificaciones push de mensajes, deck con
  memoria (descartar / me interesa / interés mutuo), moderación con rol de admin, actividad reciente,
  alertas de búsqueda guardada.
- Candidatos técnicos: `<app-navbar>` / `navbar-links` (código muerto) y el parámetro `redirect` al
  ir a login, que nadie lee.

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
- `#299 incluyó`: hallazgos #16–#21. Lección: un diálogo `fixed` no puede renderizarse dentro de
  un ancestro con `backdrop-filter` (como `MobileActionBar`), porque ese ancestro pasa a ser su
  bloque contenedor; los diálogos viven en la raíz de la página.
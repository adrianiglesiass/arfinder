---
tag: SPECS/2026-09-feat-user-block
estado: done
stack: ambos
fecha: 2026-09-10
---

# feat-user-block

## Contexto
- Greenfield para bloqueos: sin modelo, endpoints ni UI de block/report/ban/flag en el repo (verificado por grep).
- Stack solo SQLAlchemy 2.0 + PostgreSQL (sin MongoDB). `exclude_user_id` ya existe en `search_profiles`
  (service L81–96 y repo L42–89) y se pasa desde la ruta `GET /profiles` con
  `current_user.id if current_user else None`.
- Favoritos (F3) ya mergeado: `favorite_service.list_favorites` filtra solo `user_id != current_user_id`;
  la spec F3 declaró como no-goal "la lista de favoritos no filtra por bloqueados en esta fase
  (se revisará al implementar feat/user-block)" — este feature lo cierra.
- Patrones ya establecidos: modelo con `UniqueConstraint` + 2 `Index` + FK `ondelete=CASCADE`
  (`app/models/favorite.py`), errores `AppError` por dominio (`app/core/exceptions/favorite.py`),
  repo/servicio/ruta por dominio, `build_profile_summaries` público reutilizable,
  `get_public_profile` para traducir `profile_id` → usuario, página authGuard con `ProfileCard`+`EmptyState`
  (`features/favorites/`), stores con toggle optimista en `@core/` (`favorites.service.ts`),
  botón compartido OnPush en `@shared/components/`.
- El detalle de perfil (`features/profile/profile-detail.*`) es el lugar natural para bloquear
  (botón junto al info-block; barra de acciones móvil existente).

## Problema
Arfinder no permite a un usuarix ocultar/ignorar a otro: si alguien molesta, no hay forma de que sus
perfiles dejen de aparecer en búsquedas ni de des-hacer favoritos del otro lado. F4 añade bloqueo real:
exclusión bidireccional de la búsqueda y de la lista de favoritos, con listado y toggle.

## Alcance (MVP opinable)
- **Backend**
  - Modelo `UserBlock` (`app/models/block.py`), tabla `user_block`
    (`blocker_user_id`, `blocked_user_id`, `created_at`, `UniqueConstraint uq_user_block_blocker_target`).
    Relaciones `back_populates` `blocks_given`/`blocks_received` en `User`. Exportar en `app/models/__init__.py`.
  - Migración Alembic `create_user_block` (hand-written, `down_revision="8e5f4c3a2b1d"`).
  - `core/exceptions/block.py`: `BlockSelfError` (400), `BlockAlreadyExistsError` (409).
  - `repositories/block_repository.py`: `add` (check-then-insert con captura de `IntegrityError`→409),
    `remove` (idempotente, booleano), `list_blocked_user_ids` (más recientes primero, limit 200),
    `list_blocker_user_ids` (quién me bloquea), `is_blocked`.
  - `services/block_service.py`: `block_profile`, `unblock_profile`, `list_blocked` (reutiliza
    `profile_service.get_public_profile` y `build_profile_summaries`), y `excluded_user_ids(db, user_id)`
    = (bloqueados por mí ∪ quienes me bloquean), con dedupe.
  - Rutas en `routes/profile.py`:
    - `POST /profiles/{profile_id}/block` → 204 (400 self, 404 inexistente, 409 duplicado).
    - `DELETE /profiles/{profile_id}/block` → 204 (idempotente).
    - `GET /profiles/me/blocked` → `List[ProfileSummary]` (más recientes primero, `Cache-Control: no-store`).
  - **Búsqueda excluye bloqueos**: `profile_repository.search_profiles` acepta
    `exclude_user_ids: list[int] | None` (filtro `~Profile.user_id.in_(exclude_user_ids)`) manteniendo
    `exclude_user_id`; la ruta `GET /profiles` pasa `[current_user.id] + excluded_user_ids(current_user.id)`
    cuando hay sesión (anon sigue viendo todo).
  - **Favoritos excluyen bloqueos**: `favorite_service.list_favorites` descarta favoritos cuyo
    `target_user_id` esté en `excluded_user_ids` (no se borran los favoritos, solo se filtran).
  - Regenerar `api.types.ts` (3 operaciones + 2 paths).

- **Frontend**
  - `BlockApiService` (`@infrastructure/api/block`): block/unblock/getMyBlocked.
  - `BlockService` (`@core/block`): `blockedIds` (Set), `profiles`, `isLoading`, hidratación por
    effect sobre `AuthService.currentUser` y toggle **optimista** con revert que restaura el perfil removido
    (mismo patrón que `FavoritesService`, incluye `ngOnInit`-refresh en la página).
  - `BlockButton` compartido (`@shared/components/block-button`): `input.profileId`, OnPush,
    icono `pi-ban`/`pi-user-minus`, `aria-pressed`, `stopPropagation`. Se coloca en el detalle de perfil:
    junto al `profile-info-block` (desktop) y en la barra de acciones móvil — sin tocar componentes compartidos.
  - Página `/bloqueados` (authGuard, `features/blocked/`): grid que reutiliza `ProfileCard` + `EmptyState`
    + skeleton loaders; `ROUTES.BLOCKED = '/bloqueados'`; refresca en `ngOnInit`.
  - Navegación: item "Bloqueados" (`pi pi-ban`) en `sidebar-nav` (requiresAuth), `navbar-links` y `mobile-nav`.
  - `api.types.ts` regenerado (3 operaciones + 2 paths).

## No-goals
- NO gating de mensajería: un bloqueado no pierde conversaciones existentes ni se revoca en Realtime
  (se evalúa en fase posterior; el bloqueo aquí es de visibilidad en búsquedas/favoritos).
- NO reports (F5) ni "causa" de bloqueo.
- NO botón de desbloquear por tarjeta en grids: `ProfileCard` queda intacto; el desbloqueo se hace
  desde el detalle del perfil (mismo toggle) al que navega cada tarjeta.
- NO eliminar los favoritos del bloqueado (solo se ocultan mientras dura el bloqueo).
- NO paginación (limit 200 como favoritos).
- NO self-block con entendimiento "silenciar": si no se quiere ver ya existe block; no se añaden estados.

## Criterios de aceptación
- DADO un usuarix autenticado CUANDO hace `POST /profiles/{id}/block` con un perfil ajeno existente
  ENTONCES responde 204 y `GET /profiles/me/blocked` incluye ese perfil como `ProfileSummary`.
- DADO el mismo par CUANDO repite el POST ENTONCES responde 409 (no duplica).
- DADO el usuarix CUANDO hace POST sobre su propio perfil ENTONCES responde 400.
- DADO el usuarix CUANDO bloquea a un `profile_id` inexistente ENTONCES responde 404.
- DADO `A` ha bloqueado a `B` CUANDO `A` busca (con token) ENTONCES `B` no aparece; y CUANDO `B` busca
  ENTONCES `A` tampoco aparece (exclusión bidireccional). Sin token, ambos visibles.
- DADO `A` ha bloqueado a `B` y `A` tiene a `B` como favorito CUANDO `A` pide `GET /profiles/me/favorites`
  ENTONCES `B` no aparece (el favorito persiste en BD).
- DADO `A` ha bloqueado a `B` CUANDO `A` hace `DELETE /profiles/{B.profile_id}/block` ENTONCES responde
  204, la repetición responde 204 de nuevo (idempotente) y `GET /profiles/me/blocked` deja de incluirlo.
- DADO el usuarix CUANDO bloquea/desbloquea desde el detalle de perfil o en `/bloqueados`
  ENTONCES el estado visual cambia al instante (optimista) y revierte si el servidor falla.
- DADO DIECIOCHO: sin token, `GET /profiles/me/blocked` responde 401 (via dependencia global).

## Código de error
- 409: `USER_BLOCK_ALREADY_EXISTS` con `default_detail` en español.
- 400: `CANNOT_BLOCK_SELF` con `default_detail` en español.

## Convenciones (recordatorio)
- Esp: docs/UI/commits; ids en inglés. Un archivo = una responsabilidad. Reutilizar `@core/`, `@shared/`,
  `backend/app/core/`, `backend/app/schemas/`. Regenerar `api.types.ts` con `npm run generate:types`
  (o dump `app.openapi()` + openapi-typescript + prettier). OnPush en componentes. No comentarios en código.

## Tests a añadir
- Backend `tests/profiles/test_blocks.py`: crear+listar 204/200; duplicado 409; self 400; inexistente 404;
  DELETE idempotente 204 + listado vacío; 401 sin token (GET, POST); búsqueda excluye ambos sentidos
  (+ anónimo visibles); favorito bloqueado no aparece en `/profiles/me/favorites`.
- Ajustar si hace falta `tests/profiles/test_search.py` y `test_favorites.py` por la firma de
  `search_profiles`/`exclude_user_ids` (debe seguir verde sin cambios de comportamiento).
- Frontend `core/block/block.service.spec.ts` (nuevo, patrón de `favorites.service.spec.ts`):
  optimista marca/desmarca y revert en error.

## Definición de Done
1. Implementación completa de backend y frontend anterior, specs `approved`.
2. Migración `create_user_block` validada en Postgres limpio (temp DB) con la cadena completa
   base → favorites → user_block.
3. Backend: `make lint && make format-check && make test` en verde (pytest suite completa).
4. Frontend: `npm run format:check && npm run lint && npm run test:ci` en verde y build producción OK.
5. `api.types.ts` regenerado (solo añadidos).
6. Revisión `code-reviewer` read-only sin bloqueantes (o resueltos).
7. Spec a `done` con Resultado, `plan.md` actualizado, commit + PR a `develop`.
## Resultado
Implementado backend + frontend completos y verificados.

- **Backend**: modelo `UserBlock` + migración `9a1b2c3d4e5f_create_user_block` (validada en Postgres
  limpio, cadena `fd88b8d3e737 → 70c066be0088 → 3c8f2a4b9e10 → 8e5f4c3a2b1d → 9a1b2c3d4e5f`);
  `block_repository` / `block_service` / `core/exceptions/block.py`; rutas POST y DELETE
  `/profiles/{id}/block` y `GET /profiles/me/blocked`; exclusión bidireccional en `search_profiles`
  vía `exclude_user_ids` y filtrado de bloqueados en `favorite_service.list_favorites`.
- **Frontend**: `BlockApiService`, `BlockService` con toggle optimista y revert, `BlockButton`
  compartido (con variante compacta para la barra de acciones móvil), página `/bloqueados` que
  reutiliza `ProfileCard` + `EmptyState`, y navegación en `sidebar-nav` y `navbar-links`.
- **Códigos de error**: `USER_BLOCK_ALREADY_EXISTS` (409) y `CANNOT_BLOCK_SELF` (400), fijados
  explícitamente en las excepciones y cubiertos por test.

Correcciones aplicadas tras la revisión de la implementación inicial:
1. Los códigos de error emitidos eran `BLOCK_ALREADY_EXISTS` / `BLOCK_SELF` en vez de los que
   define esta spec → se fijan con el atributo `code` de `AppError`.
2. `favorite_service.list_favorites` reconstruía a mano la unión de bloqueados y bloqueadores →
   pasa a reutilizar `block_service.excluded_user_ids`.
3. El `BlockButton` se mostraba a visitantes sin sesión (el guard era `!isOwnProfile()`, que es
   `true` para anónimos): al pulsarlo el POST devolvía 401 y el estado revertía en silencio →
   nuevo `showBlockButton()` que exige sesión.
4. En la barra de acciones móvil el botón (`w-full px-4`) desbordaba su contenedor de 42px y se
   solapaba con "Mensaje" → nueva variante `compact` icon-only.
5. La barra inferior móvil no admitía un quinto slot en pantallas de 360px → "Bloqueados" sale del
   `mobile-nav` y se mantiene en `sidebar-nav`, `navbar-links` y menú de usuario.
6. Las tarjetas de `/bloqueados` mostraban el botón de favorito, que creaba favoritos que el
   backend filtra de inmediato → `ProfileCard` acepta `showFavorite` (por defecto `true`).

Huecos de test cerrados: el favorito de un bloqueado persiste en BD y reaparece al desbloquear;
el revert de un desbloqueo fallido restaura el perfil removido de la lista.

## Checklist de verificación
- [x] Backend: `ruff check .` — All checks passed
- [x] Backend: `ruff format --check .` — 87 files already formatted
- [x] Backend: `pytest` — **73 passed**
- [x] Migración validada en Postgres limpio (cadena completa hasta `9a1b2c3d4e5f`)
- [x] Frontend: `npm run format:check` — All matched files use Prettier code style
- [x] Frontend: `npm run lint` — All files pass linting
- [x] Frontend: `npm run test:ci` — **24 passed** (5 files)
- [x] Frontend: `npm run build` — bundle generado sin errores

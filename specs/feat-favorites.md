---
tag: SPECS/2026-09-feat-favorites
estado: done
stack: ambos
fecha: 2026-09-10
---

# feat-favorites

## Contexto
- No existe ningún concepto de favoritos en backend ni frontend (greenfield).
- Los perfiles se exploran en `/explorar` (deck + grid) y `/perfil/:id`, y la búsqueda
  `GET /profiles` ya devuelve `ProfileSummary` con fotos.
- Un favorito es del usuarix → a un perfil ajeno: tabla `favorite(user_id, target_user_id)`.
- Precedente de navegación: sidebar `items`, `navbar-links`, `mobile-nav` (listas duplicadas).

## Problema
Arfinder no permite guardar perfiles para revisitarlos, así que el usuarix tiene que volver a
buscar/filtrar cada vez; no hay "mis favoritos" ni marcado rápido desde las tarjetas.

## Alcance
MVP opinable que cubre el valor completo del campo sin arrastrar dependencias:

- **Backend**
  - Modelo `Favorite` + migración Alembic `create_favorites`.
  - `favorite_repository` (add/remove/list/is_favorite) y `profile_repository.get_profiles_by_user_ids`.
  - `favorite_service` con validaciones; endpooints:
    - `POST /profiles/{profile_id}/favorite` → 204 (idempotente: 409 si ya existe).
    - `DELETE /profiles/{profile_id}/favorite` → 204 (idempotente, no falla si no existe).
    - `GET /profiles/me/favorites` → `List[ProfileSummary]` (más recientes primero, `Cache-Control: no-store`).
  - Reutilizar el mapeo a `ProfileSummary`: extraer `profile_service._profile_to_summary` →
    `build_profile_summaries` público, usado por `search_profiles` y `list_favorites`.
  - Regenerar `api.types.ts` (2 operaciones nuevas + una ruta de listado).

- **Frontend**
  - `FavoritesApiService` (`@infrastructure/api/favorites`): favorite/unfavorite/getMyFavorites.
  - `FavoritesService` (`@core/favorites`): `favoriteIds` (Set), `profiles`, hidratación al hacer login
    (effect sobre `AuthService.currentUser`) y toggle **optimista** con revert en error.
  - Componente compartido `FavoriteButton` (`@shared/components/favorite-button`): corazón
    `pi-heart`/`pi-heart-fill`, `input.profileId`, OnPush. Se coloca en:
    - `profile-card` (grid) — resuelto con overlay absoluto fuera del `<a>`.
    - `profile-deck-card` (deck) — botón superior derecho.
  - Página `/favoritos` (authGuard): grid que reutiliza `ProfileCard` + `EmptyState` + estado de carga;
    `ROUTES.FAVORITES`.
  - Navegación: item "Favoritos" (icono corazón) en `sidebar-nav`, `navbar-links` y `mobile-nav`.

## No-goals
- NO añadir filtros de búsqueda ("solo favoritos") en `/explorar`: se cubre con la página `/favoritos`.
- NO botón en `/perfil/:id` (se puede añadir en fase posterior; el `FavoriteButton` es reutilizable).
- NO interacción con bloqueos (F4): la lista de favoritos no filtra por bloqueados en esta fase
  (se revisará al implementar `feat/user-block`).
- NO compartir favoritos, ni notificaciones, ni "amigos mutuos".
- NO filtrar por favoritos en el API de search.

## Criterios de aceptación
- DADO un usuarix autenticado CUANDO hace `POST /profiles/{id}/favorite` con un perfil ajeno existente
  ENTONCES responde 204 y `GET /profiles/me/favorites` incluye ese perfil como `ProfileSummary`.
- DADO el mismo par de nuevo CUANDO repite el POST ENTONCES responde 409 (no duplica).
- DADO el usuarix CUANDO hace POST sobre su propio perfil ENTONCES responde 400.
- DADO el usuarix CUANDO apunta a un `profile_id` inexistente ENTONCES responde 404.
- DADO un favorito existente CUANDO se hace `DELETE /profiles/{id}/favorite` ENTONCES responde 204 y
  el perfil desaparece del listado; repetir el DELETE vuelve a dar 204 (idempotente).
- DADO `GET /profiles/me/favorites` SIN token ENTONCES responde 401 (PROTECTED).
- DADO el usuarix en `/explorar` (grid o deck) CUANDO pulsa el corazón ENTONCES el favorito se marca
  al instante (optimista) y persiste al recargar / navegar a `/favoritos`.
- DADO el usuarix en `/favoritos` CUANDO desmarca un perfil ENTONCES este desaparece de la página.
- DADO el usuarix en `/favoritos` SIN favoritos ENTONCES ve EmptyState con CTA a `/explorar`.

## Decisión técnica
- **FK apunta al `User`** (`target_user_id`), no al `Profile`: un usuarix tiene como máximo un perfil,
  y el favorito sobrevive conceptualmente al perfil. El endpoint acepta `profile_id` y traduce internamente
  a `profile.user_id` (`profile_service.get_public_profile` para validar existencia).
- **POST idempotente con 409** si ya existe (mejor que un PUT mudo: informa al cliente para no re-hidratar);
  el frontend lo trata como "ya favorito" sin error de UX.
- **Toggle optimista**: `FavoriteButton` muta el Set al instante; en error revierte y expone `error`
  (sin toast en MVP; el estado se re-hidrata con la siguiente acción/recarga).
- **`build_profile_summaries`** en `profile_service` reemplaza el bucle duplicado de `search_profiles`
  y lo usa `favorite_service.list_favorites` (responsabilidad única + reutilización).
- **Sin schema de respuesta nuevo**: el POST/DELETE devuelven 204 y el listado reusa `ProfileSummary`.
- **Orden del listado**: `created_at DESC, id DESC` (más recientes primero).
- **Grid reutilizado**: la página `/favoritos` renderiza `app-profile-card` con las clases de layout
  del grid actual (no reusar `ProfileGrid`: está acoplado a `ProfileSearchService`).

## Plan de tests
Backend (`tests/profiles/test_favorites.py`, patrón `client` + `profile_madrid`/`profile_barcelona`):
- POST crea favorito y GET `/me/favorites` lo incluye (1 perfil).
- POST repetido → 409; prórpto perfil propio → 400; perfil inexistente → 404.
- DELETE elimina (204 en ambos casos; después del DELETE el listado queda vacío).
- GET `/me/favorites` sin token → 401.
- Orden: dos favoritos → el más reciente primero.
- (repos/service directo si aporta: omitir; los endpoint cubren la lógica).

Frontend:
- `favorites.service.spec.ts` (mock de api + auth): toggle marca/desmarca; toggle fallido revierte.
- Presence en `profile-card`/`profile-deck-card`: no se añade spec de snapshot; se valida por build + revisión.

## Checklist de verificación
- [ ] Backend: `ruff check .` y `ruff format --check .`
- [ ] Backend: `pytest --tb=short` (override `DATABASE_URL` a compose `db-test`)
- [ ] Alembic: `alembic upgrade head` en dev sin errores; revisar la migración generada
- [ ] Frontend: `npm run format:check`, `npm run lint`, `npm run test:ci`
- [ ] Frontend: build producción (`npx ng build --configuration production`)
- [ ] `npm run generate:types` ejecutado; confirmar operaciones nuevas de favoritos

## Resultado
- Backend: modelo `Favorite` (`user_id`→`target_user_id`, unique `uq_favorite_user_target`, FK CASCADE a `user`)
  + migración `8e5f4c3a2b1d` (validada en Postgres limpio: cadena completa base→headers→favorites). Repo
  `favorite_repository` (add con captura de `IntegrityError`→409, remove idempotente, list, is_favorite) y
  `favorite_service` que reutiliza `profile_service.get_public_profile` y `build_profile_summaries`.
  Endpoints: `POST/DELETE /profiles/{profile_id}/favorite` (204) y `GET /profiles/me/favorites`
  (`List[ProfileSummary]` ordenado por `created_at DESC`, `Cache-Control: no-store`).
- Frontend: `FavoritesApiService`, `FavoritesService` (toggle optimista con revert que restaura el perfil removido;
  hidratación por `effect` sobre `auth.currentUser` siguiendo `ConversationStore`), `FavoriteButton` compartido
  con `stopPropagation` (integrado en `profile-card` como overlay hermano del `<a>` y en `profile-deck-card`);
  página `/favoritos` (authGuard) que refresca en `ngOnInit`, reusa `ProfileCard`/`EmptyState` y filtra
  `visibleProfiles`; nav en `sidebar-nav`, `navbar-links` y `mobile-nav`; `ROUTES.FAVORITES`.
- Contrato: `api.types.ts` regenerado (3 operaciones de favoritos + 2 paths; +183 líneas, sin borrados).
- Tests: backend `tests/profiles/test_favorites.py` (7: crear+listar, 409, 400 propio, 404, DELETE idempotente,
  401, orden) → suite **61 passed**; frontend `favorites.service.spec.ts` (3: optimista marca/desmarca, revert) → **20/20**.
- Revisión `code-reviewer` (read-only): **SOLICITO CAMBIOS** — 3 bloqueantes resueltos: (`1`) `ruff format`
  de la migración; (`2`) bubbling del click del corazón en el deck (`stopPropagation`); (`3`) asimetría del
  `FavoritesService` (se restaura el perfil en `profiles` al revertir y `/favoritos` refresca en cada visita).
  No-bloqueantes aplicados: reutilizar `get_public_profile`, `back_populates` en vez de `backref`,
  `IntegrityError`→409 en el repo.
- Verificación final: backend `ruff check` ✓ / `ruff format --check .` ✓ / pytest **61 passed**;
  frontend `format:check` ✓ / `lint` ✓ / `test:ci` **20 passed** / build producción ✓;
  migración aplicada de cero en Postgres limpio (temp DB) y verificado el esquema `\d favorite`.
- PR: `feat/favorites` → develop.
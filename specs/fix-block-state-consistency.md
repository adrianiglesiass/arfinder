---
tag: SPECS/2026-09-fix-block-state-consistency
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-block-state-consistency

## Contexto
- Tras bloquear, el toast del detalle (`profile-detail.ts`) dice "Ya no os veréis en las búsquedas
  ni en favoritos". En el backend es cierto (F4: `search_profiles` y `list_favorites` excluyen los
  bloqueos), pero en el frontend no:
  - `BlockService.toggle()` (`core/block/block.service.ts`) no avisa a `FavoritesService`: el corazón
    del mismo perfil sigue rojo y el perfil sigue en `favoriteIds`.
  - `ProfileSearchService` (`core/profile-search/profile-search.service.ts`) cachea los resultados
    durante 2 minutos: al volver a Explorar, el perfil bloqueado sigue en el deck o la cuadrícula.
- Al desbloquear, el backend vuelve a incluir el favorito (no se borró), pero `favoriteIds` no lo
  sabe: el corazón sale vacío y, al pulsarlo, el `POST` devuelve 409 y se revierte en silencio.
- Reportar también bloquea (F5), así que `ReportService` tiene el mismo problema.
- El deck usa `ProfileSearchService.deckIndex` como posición.

## Problema
Después de bloquear, la interfaz sigue mostrando al usuario bloqueado donde se le dijo que ya no
aparecería; y después de desbloquear no se puede volver a marcar como favorito.

## Alcance
- `ProfileSearchService.removeProfile(profileId)`: lo quita de los resultados cargados y, si estaba
  antes de la posición actual del deck, retrocede `deckIndex` una posición.
- `BlockService`: tras un bloqueo con éxito, quita el perfil de la búsqueda cargada y refresca
  favoritos; tras un desbloqueo con éxito, refresca favoritos. Método `syncAfterBlockChange` que
  también usa `ReportService` tras un reporte.

## No-goals
- NO se oculta la conversación con el bloqueado: eso es la feature F6
  (`feat/block-cuts-messaging`), que necesita cambios de backend.
- NO se corrige el desfase de paginación por `skip` al quitar un perfil localmente (a lo sumo un
  perfil puede saltarse en la página siguiente); se revisa en `fix/frontend-state` (#40).

## Criterios de aceptación
- DADO un perfil marcado como favorito CUANDO se bloquea ENTONCES el corazón deja de estar marcado y
  el perfil no aparece en `/favoritos`.
- DADO un perfil presente en la búsqueda cargada CUANDO se bloquea ENTONCES desaparece del deck y de
  la cuadrícula sin recargar, y el deck no salta de perfil.
- DADO un favorito oculto por un bloqueo CUANDO se desbloquea ENTONCES vuelve a aparecer marcado.
- DADO un reporte enviado con éxito ENTONCES pasa lo mismo que al bloquear.

## Decisión técnica
- Coordinar desde `BlockService`, que es quien sabe que ha cambiado un bloqueo, en vez de que cada
  pantalla se acuerde de refrescar otros stores. No crea ciclos: ni `FavoritesService` ni
  `ProfileSearchService` dependen de `BlockService`.
- Refrescar favoritos desde el servidor en lugar de editarlos a mano: el backend ya aplica la regla
  de exclusión, así no se duplica.

## Plan de tests
- `core/profile-search/profile-search.service.spec.ts` (nuevo): `removeProfile` quita el perfil y
  ajusta `deckIndex` según su posición.
- `core/block/block.service.spec.ts`: tras bloquear se llama a `removeProfile` y a
  `favorites.refresh`; tras desbloquear, solo a `favorites.refresh`; si la API falla, a ninguno.
- `core/report/report.service.spec.ts`: tras un reporte con éxito se sincroniza.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes, con las instrucciones de `.opencode/agent/code-reviewer.md` y `ui-ux-reviewer.md` → los dos **APROBADO CON CAMBIOS MENORES / OBSERVACIONES**, sin bloqueantes.

**Cambio de diseño tras la revisión.** La primera versión hacía que `BlockService` inyectara
`FavoritesService` y `ProfileSearchService`. El code-reviewer detectó que así, al abrir un perfil desde
un enlace compartido, se creaba `ProfileSearchService` y su constructor lanzaba una búsqueda que nadie
había pedido. Ahora hay un bus mínimo, `BlockEvents` (`core/block/block-events.ts`):
- `BlockService` emite `{ profileId, blocked }` tras un bloqueo o desbloqueo con éxito, y en
  `markBlocked()`.
- `FavoritesService` y `ProfileSearchService` se suscriben en su constructor. Solo reaccionan si ya
  existen, y ninguno crea a otro.

Resultado final:
- **Al bloquear:** el favorito se quita de `favoriteIds` **al instante** (el ui-ux-reviewer vio que
  esperar al GET dejaba el corazón rojo tras el toast), luego se refresca desde el servidor y se vuelve a
  quitar por si la respuesta era de una petición anterior. El perfil sale de la búsqueda cargada
  (`removeProfile`, que retrocede `deckIndex` si hace falta y pide más perfiles si era el último cargado).
- **Al desbloquear:** se refrescan favoritos y la búsqueda se marca como caducada, así que el perfil
  vuelve en la próxima visita a Explorar, como promete el toast.
- **Detalle:** el corazón se oculta mientras el perfil está bloqueado (antes se podía pulsar y el `POST`
  daba 409 en silencio).
- Tests: `block.service.spec.ts` (emite solo con éxito; `markBlocked`), `favorites.service.spec.ts`
  (quita al instante al bloquear), `profile-search.service.spec.ts` (7 tests, incluidos los eventos).

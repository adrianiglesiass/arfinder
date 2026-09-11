---
tag: SPECS/2026-09-fix-block-state-consistency
estado: approved
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
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Frontend: `npm run build`

## Resultado

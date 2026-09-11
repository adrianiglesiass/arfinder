---
tag: SPECS/2026-09-fix-optimistic-toggle-races
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-optimistic-toggle-races

## Contexto
- `FavoritesService.toggle()` y `BlockService.toggle()` (`core/favorites`, `core/block`) son optimistas
  y no controlan la concurrencia:
  - **refresh contra toggle:** si un `refresh()` está en vuelo (al entrar en `/favoritos` o al arrancar
    tras el login) y el usuario hace un toggle, la respuesta del `GET`, calculada antes del cambio, pisa
    `favoriteIds` y `profiles` y deshace el toggle en la interfaz.
  - **doble toque:** dos pulsaciones rápidas lanzan `POST` y `DELETE` en paralelo, sin orden garantizado
    en el servidor, y el estado final puede no coincidir con lo que muestra la interfaz.
- Un `POST /favorite` que responde 409 significa que el favorito **ya existe**, pero hoy se trata como un
  fallo y se revierte.

## Problema
Marcar favoritos o bloquear rápido, o mientras carga la lista, puede dejar la interfaz mostrando un
estado distinto del que hay en el servidor.

## Alcance
- En los dos servicios, un conjunto de ids pendientes: mientras hay una petición en vuelo para un id, los
  toggles sobre ese id se ignoran.
- Un contador de versión: si ha habido un toggle durante un `refresh()`, su respuesta no pisa el estado.
- `FavoritesService`: un 409 al marcar se trata como éxito.

## No-goals
- NO se encolan los toggles ignorados.

## Criterios de aceptación
- DADO un toggle en vuelo CUANDO se vuelve a pulsar el mismo id ENTONCES no se lanza otra petición.
- DADO un `refresh()` en vuelo CUANDO se hace un toggle y después responde el `refresh` ENTONCES el toggle
  no se deshace.
- DADO un `POST` de favorito que responde 409 ENTONCES el corazón sigue marcado.

## Decisión técnica
- Ignorar en vez de encolar: un segundo toque durante la petición casi siempre es un doble clic
  accidental.

## Plan de tests
- `favorites.service.spec.ts` y `block.service.spec.ts`: segundo toggle ignorado mientras hay uno en vuelo;
  un `refresh` antiguo no pisa un toggle posterior; 409 como éxito en favoritos.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → BLOQUEADO** (un bloqueante y varios menores) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**. Todo lo bloqueante y lo menor se ha aplicado. Cambio aplicado tras ella: la versión solo
detectaba toggles que empezaban o terminaban durante el `GET`. Si el usuario pulsaba el corazón con un `POST`
lento y el `GET` respondía antes, el favorito desaparecía y nadie lo volvía a aplicar. Ahora, al aplicar la
respuesta del servidor, **se conserva el estado optimista de los ids que siguen pendientes**
(`applyServerList`), en favoritos y en bloqueos.

- Ids pendientes (un segundo toggle sobre un id en vuelo se ignora), contador de versión con hasta 3
  intentos del `refresh`, y 409 como éxito al marcar favorito.
- Queda documentado: `BlockService.toggle` devuelve `false` si el id ya está pendiente, lo que el detalle
  mostraría como "No se pudo bloquear". No ocurre en la práctica porque el detalle bloquea la acción con
  `safetyBusy` mientras hay una en curso.
- Tests: doble toque, refresh antiguo, toggle más lento que el refresh, 409 y error de refresh, en los dos
  servicios.

---
tag: SPECS/2026-09-fix-optimistic-toggle-races
estado: approved
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
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Frontend: `npm run build`

## Resultado

---
tag: SPECS/2026-09-fix-profile-detail-favorite
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-profile-detail-favorite

## Contexto
- F3 (#294) añadió `FavoriteButton` (`@shared/components/favorite-button`) en `ProfileCard` (grid,
  favoritos) y en `ProfileDeckCard` (deck), pero **no** en el detalle de perfil
  (`features/profile/profile-detail.*`), que es justo donde el usuario decide si un perfil le encaja.
- `FavoriteButton` solo tiene el aspecto "overlay" (círculo blanco con sombra sobre una foto).
- `FavoriteButton` no comprueba la sesión: un visitante anónimo puede pulsar el corazón en la
  búsqueda (`GET /profiles` es público). El toggle es optimista, el POST devuelve 401,
  `authErrorInterceptor` no redirige y `FavoritesService.toggle()` revierte en silencio. Es el mismo
  defecto que F4 corrigió para el botón de bloquear.
- Patrón existente para acciones que requieren sesión: `ProfileDetail.sendMessage()` redirige a
  `ROUTES.LOGIN` con `queryParams.redirect` cuando no hay usuario.

## Problema
Dentro del perfil no se puede guardar en favoritos, solo desde las tarjetas; y un visitante sin
sesión que pulsa el corazón ve cómo se rellena y se vacía sin explicación.

## Alcance
- `FavoriteButton` acepta `appearance: 'overlay' | 'outline'` (por defecto `'overlay'`, sin cambio para
  tarjetas). `'outline'` es un círculo con borde que encaja junto a los botones de la tarjeta de info.
- El detalle de perfil muestra el corazón `outline` en el slot de acciones de `ProfileInfoBlock`
  (escritorio) y en `MobileActionBar` (móvil), junto al menú "⋯" de
  `fix-profile-safety-actions`. No se muestra en el propio perfil.
- Sin sesión, `FavoriteButton` redirige a login con `redirect` a la URL actual en lugar de hacer el
  toggle, igual que "Enviar mensaje". Aplica a tarjetas, deck y detalle.

## No-goals
- NO cambia `FavoritesService` ni el backend.
- NO se implementa la vuelta a la página tras el login. El botón envía `redirect` igual que "Enviar
  mensaje", pero **ningún código lee ese parámetro** (ni el login por email ni el callback OAuth):
  es un defecto previo, anotado en `plan.md` como candidato.
- NO se muestra un toast al marcar favorito: el cambio del icono ya es el feedback, como en tarjetas.

## Criterios de aceptación
- DADO un usuario con sesión en el detalle de un perfil ajeno CUANDO pulsa el corazón ENTONCES se
  marca al instante y el perfil aparece en `/favoritos`; si vuelve a pulsar, se desmarca.
- DADO un perfil marcado desde una tarjeta CUANDO abre su detalle ENTONCES el corazón aparece marcado.
- DADO un visitante sin sesión CUANDO pulsa el corazón en una tarjeta, el deck o el detalle ENTONCES
  va a login y no se llama a la API.
- DADO el propio perfil CUANDO se abre su detalle ENTONCES no hay corazón.

## Decisión técnica
- Una variante de apariencia en el componente existente, en lugar de un segundo botón de favorito:
  la lógica (estado, toggle optimista) sigue en un único sitio.
- Redirigir a login en vez de ocultar el corazón a anónimos: mantiene la acción visible como
  incentivo para registrarse, y es lo que ya hace "Enviar mensaje".

## Plan de tests
- `shared/components/favorite-button/favorite-button.spec.ts` (nuevo): con sesión llama a
  `FavoritesService.toggle`; sin sesión navega a login con `redirect` y no llama al servicio.

## Checklist de verificación
- [x] Frontend: `npm run format:check` — All matched files use Prettier code style
- [x] Frontend: `npm run lint` — All files pass linting
- [x] Frontend: `npm run test:ci` — **32 passed** (8 files)
- [x] Frontend: `npm run build` — bundle de producción generado
- [ ] Verificación visual en navegador (360px y 1280px) — parcial, ver Resultado

## Resultado
Implementado según el alcance.

- `FavoriteButton` acepta `appearance: 'overlay' | 'outline'`. `outline` es un círculo de 40×40 con
  borde, del mismo tamaño que el botón "⋯", para que la fila del detalle quede alineada.
- El detalle muestra el corazón `outline` en el slot de acciones de `ProfileInfoBlock` y en
  `MobileActionBar`, en ambos casos junto al menú "⋯".
- Sin sesión, el corazón navega a `ROUTES.LOGIN` con `redirect` a la URL actual y no llama al
  servicio. Aplica a tarjetas, deck y detalle.

Verificación en navegador: con y sin sesión, el corazón aparece en el detalle a 1920px. La
redirección de invitados está cubierta por `favorite-button.spec.ts`; no se comprobó en navegador.

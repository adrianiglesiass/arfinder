---
tag: SPECS/2026-09-fix-card-favorite-hover-jank
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-card-favorite-hover-jank

## Contexto
- `ProfileCard` (`features/profile/components/profile-card/profile-card.html`) aplica el efecto hover
  al `<a>` interior: `group … hover:-translate-y-1 hover:shadow-(--shadow-glass)`, y la foto hace
  `group-hover:scale-[1.04]`.
- El `FavoriteButton` es **hermano** de ese `<a>` (`absolute top-4 right-4 z-20` en el `div`
  contenedor), no hijo. Al mover el ratón del cuerpo de la tarjeta al corazón, el puntero deja de
  estar sobre el `<a>`: la tarjeta pierde `:hover`, **baja 4px, pierde la sombra y la foto se
  des-escala**, mientras el corazón se queda donde estaba porque nunca se movió con la tarjeta. Es el
  "ajuste visual" que se ve justo al ir a dar like en escritorio.
- En el deck (`profile-deck.html`), el `<article>` de la carta activa escucha `pointerdown` para
  iniciar el arrastre. El `FavoriteButton` de `ProfileDeckCard` solo detiene la propagación del
  `click`, así que pulsar el corazón también arranca un arrastre (`dragging = true`), que cambia la
  transición de la carta mientras se mantiene pulsado.

## Problema
En escritorio, al ir a dar like a una tarjeta, la tarjeta da un salto y la foto se mueve, lo que
resulta incómodo justo en el momento de la interacción.

## Alcance
- `ProfileCard`: el efecto hover (elevación, sombra y `group` del zoom de la foto) pasa al `div`
  contenedor, que ya envuelve al `<a>` y al corazón. El corazón se mueve con la tarjeta y la tarjeta
  no pierde el hover cuando el puntero está sobre él. El redondeo y el foco visible del `<a>` se
  mantienen.
- `FavoriteButton`: detiene también la propagación de `pointerdown`, para que pulsarlo no inicie el
  arrastre del deck.

## No-goals
- NO se cambia la animación del propio corazón (`active:scale-90`, `hover:scale-105`).
- NO se toca la lógica de arrastre del deck.

## Criterios de aceptación
- DADO una tarjeta del grid en escritorio CUANDO el puntero pasa del cuerpo de la tarjeta al corazón
  ENTONCES la tarjeta sigue elevada, con sombra y con la foto ampliada, y el corazón se mueve con ella.
- DADO la carta activa del deck CUANDO se pulsa y mantiene el corazón ENTONCES la carta no entra en
  modo arrastre; al soltar, el favorito cambia y la carta no se mueve.
- DADO una tarjeta CUANDO se pulsa fuera del corazón ENTONCES sigue navegando al perfil.

## Decisión técnica
- Mover el hover al contenedor común corrige la causa (el corazón fuera del elemento con `:hover`).
  Alternativa descartada: meter el corazón dentro del `<a>`, que produce un botón anidado en un
  enlace (HTML inválido y problemas de accesibilidad).

## Plan de tests
- Verificación visual en navegador a 1280px en grid y deck: es un defecto de estilos y eventos de
  puntero que no se reproduce en el entorno de tests unitarios (sin layout ni `:hover`).
- `favorite-button.spec.ts` (de `fix-profile-detail-favorite`): `pointerdown` no se propaga.

## Checklist de verificación
- [x] Frontend: `npm run format:check` — All matched files use Prettier code style
- [x] Frontend: `npm run lint` — All files pass linting
- [x] Frontend: `npm run test:ci` — **32 passed** (8 files)
- [x] Frontend: `npm run build` — bundle de producción generado
- [x] Verificación en navegador (grid y deck), ver Resultado

## Resultado
Implementado según el alcance.

Verificado en navegador midiendo estilos calculados y posiciones reales, con las transiciones
desactivadas para leer el estado final. Primero se reprodujo el defecto recreando en el DOM la
estructura anterior (hover en el `<a>`), y después se midió el arreglo (valores en px de `top`):

| Puntero | Antes: tarjeta / corazón / zoom | Después: tarjeta / corazón / zoom |
|---|---|---|
| fuera | 90 / 106 / 1 | 90 / 106 / 1 |
| sobre el cuerpo | 86 / **106** / 1.04 (corazón desalineado 4px) | 86 / 102 / 1.04 |
| sobre el corazón | **90** / 106 / **1** (la tarjeta baja y pierde el zoom) | 86 / 102 / 1.04 |

En el deck, al despachar `pointerdown` sobre el corazón de la carta activa, **0** eventos llegan a
la carta (antes llegaba y arrancaba el arrastre); sobre el cuerpo de la carta sigue llegando 1.

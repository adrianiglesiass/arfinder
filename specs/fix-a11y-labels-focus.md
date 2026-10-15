---
tag: SPECS/2026-10-fix-a11y-labels-focus
estado: done
stack: frontend
fecha: 2026-10-15
---

# fix-a11y-labels-focus

## Contexto
- `MessageComposer`: el botón de enviar solo tiene un SVG (`aria-hidden`) y el textarea solo un
  `placeholder`.
- `SearchFilters`: "Ciudad", "Presupuesto máximo", "Edad" y "Disponible desde" son `<span>` sin relación
  con su control; el `inputId` del `<input type="date">` no es un atributo de un input nativo.
  `FilterChipGroup` no agrupa sus botones ni indica cuál está pulsado. En `StepProfile`,
  `<label for="city">` apunta a un id que no existe.
- Foco visible eliminado sin sustituto: `outline-none` en las tarjetas de `StepObjective`,
  `focus-visible:outline-none` en las flechas de `PhotoGallery`, `focus:outline-none` en el avatar de
  `NavbarUserMenu`, `ProfileCard` solo cambia el color de un borde de 1 px, y la papelera de `PhotoCard`
  es invisible (`md:opacity-0`) cuando recibe el foco.
- `ProfileDeck`: el `<article>` de la carta activa es `role="button"` y contiene otros botones (fotos,
  favorito): controles interactivos anidados. Las cartas de detrás siguen siendo enfocables. Y
  `messages.html` tiene un `<main>` dentro del `<main>` del layout.

## Problema
Un lector de pantalla anuncia "botón" sin nombre al enviar y campos de filtro sin etiqueta; quien navega
con teclado pierde el foco de vista en varios sitios y en el deck tabula por cartas ocultas.

## Alcance
- Composer: `aria-label` "Escribe un mensaje" y "Enviar mensaje".
- Filtros: `<label for>` en ciudad y fecha, `ariaLabelledBy` en el slider, `ariaLabel` "Edad mínima" /
  "Edad máxima" y un `role="group"` para la edad. Ids únicos por instancia (los filtros se pintan dos
  veces: panel lateral y hoja móvil). `FilterChipGroup` con `role="group"` + `aria-labelledby` y
  `aria-pressed`. `CityAutocomplete` acepta `inputId`, y `StepProfile` lo usa.
- Foco visible: anillo `focus-visible` en los elementos citados; la papelera se muestra con el foco.
- Deck: el `<article>` deja de ser botón; el texto "Ver perfil completo" pasa a ser un `<button>` real
  que abre el perfil; las cartas de detrás llevan `inert`. Tocar la carta (sin arrastrar) sigue abriendo
  el perfil, salvo si el toque cae en uno de sus botones. Las flechas del teclado no pasan de carta si
  el foco está en un campo, un slider o un diálogo (antes, mover el slider de presupuesto o escribir la
  edad con las flechas pasaba cartas). El `<main>` de mensajes pasa a `<section>`.

## No-goals
- NO se rediseña el deck ni cambia el gesto de deslizar o tocar la carta.

## Criterios de aceptación
- DADO un lector de pantalla ENTONCES el botón de enviar se anuncia "Enviar mensaje" y cada filtro tiene
  nombre.
- DADO navegación con Tab ENTONCES todos los elementos interactivos citados muestran un anillo de foco.
- DADO el deck ENTONCES no hay controles anidados en otro control, Tab no entra en las cartas de detrás y
  "Ver perfil completo" abre el perfil con teclado.

## Decisión técnica
- Anillos con utilidades de Tailwind (`focus-visible:ring-2`…), coherentes con los que ya usan los inputs.
- El botón "Ver perfil completo" emite `opened`. El toque sobre la carta se detecta en `pointerup` (sin
  movimiento y fuera de un `button`/`a`) en lugar de un `click` en el `<article>`: así el artículo no
  tiene un manejador de clic sin equivalente de teclado (regla de lint de accesibilidad) y no se navega
  dos veces.
- Ids únicos por instancia con `shared/utils/unique-id.ts`.

## Plan de tests
- `MessageComposer` (nuevo spec): el botón de enviar tiene nombre accesible.
- `search-filters.spec.ts`: cada control tiene etiqueta y los ids no se repiten entre dos instancias.
- `profile-deck.spec.ts` (nuevo): sin `role="button"` en la carta, cartas de detrás `inert`, el toque y
  el botón abren el perfil una sola vez, y las flechas dentro de un campo no pasan de carta.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Build: `ng build --configuration production`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → APROBADO CON CAMBIOS** (sin bloqueantes) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES** (sin bloqueantes). Cambios aplicados tras ella:
- el toque en la carta solo cuenta con el botón principal del ratón (un clic derecho o central ya no abre
  el perfil, regresión del cambio de `click` a `pointerup`);
- la carta se anuncia como "Perfil de <nombre>".

Descartado: `aria-valuetext` en el slider de presupuesto (el `p-slider` de PrimeNG 21 no lo expone) y
pasar los chips a `radiogroup` (opcional; `aria-pressed` es válido).

- Tests nuevos: `message-composer.spec.ts` (2), `profile-deck.spec.ts` (5) y 2 más en
  `search-filters.spec.ts`.

Verificación final: `format:check`, `lint`, `test:ci` (**139 tests**, 23 archivos) y build de
producción.

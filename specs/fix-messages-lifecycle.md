---
tag: SPECS/2026-09-fix-messages-lifecycle
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-messages-lifecycle

## Contexto
- `Messages.ngOnInit()` (`features/messages/messages.ts`) hace `await this.store.refresh()` y después
  registra los handlers de realtime y selecciona la conversación de la URL. Si el componente se destruye
  durante ese `await` (el usuario se va a Explorar con la red lenta), el resto se ejecuta igualmente:
  - los handlers de mensajes y lecturas se registran y **nunca se quitan** (el `onDestroy` ya corrió);
  - `selectConversation` llama a `store.setActiveConversation(id)`, así que los mensajes nuevos de esa
    conversación **no suben el contador de no leídos**;
  - `location.go('/mensajes/:id')` cambia la URL mientras se ve otra pantalla.
- `sendMessage()` captura la conversación al empezar pero no comprueba `selectionEpoch` al terminar. Si el
  usuario cambia de conversación mientras el `POST` está en vuelo:
  - `replaceOptimistic` añade el mensaje de A a la lista de B;
  - si el envío falla, el texto se restaura en el composer de B;
  - si A era un borrador, `adoptNewConversation` le devuelve a la conversación nueva.
- Un envío fallido quita el mensaje y restaura el texto **sin ningún aviso** (#45).

## Problema
Salir de mensajes durante la carga deja el contador de no leídos roto, y cambiar de conversación durante
un envío mezcla mensajes y textos entre conversaciones.

## Alcance
- `destroyed` en el `onDestroy`; tras cada `await` de `ngOnInit`, si está destruido no se sigue.
- `sendMessage()` guarda la época al empezar. Al terminar, si ha cambiado, solo actualiza la vista previa
  de la conversación en el store, sin tocar `messages`, el composer ni la selección.
- Un envío fallido muestra un aviso en la conversación ("No se pudo enviar el mensaje").

## No-goals
- NO se reintenta automáticamente el envío.

## Criterios de aceptación
- DADO el componente destruido durante la carga inicial ENTONCES no quedan handlers registrados ni
  conversación activa en el store.
- DADO un envío en vuelo en A CUANDO se cambia a B ENTONCES el mensaje de A no aparece en B y, si falla, el
  texto no se restaura en el composer de B.
- DADO un envío fallido en la conversación actual ENTONCES se restaura el texto y se muestra el aviso.

## Decisión técnica
- Reutilizar `selectionEpoch`, que el componente ya usa para las cargas de mensajes, en vez de introducir
  otro mecanismo.

## Plan de tests
- `features/messages/messages.spec.ts`: destruir durante `ngOnInit` no registra handlers; un envío que
  termina tras cambiar de conversación no toca la lista nueva; un envío fallido muestra el aviso.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → BLOQUEADO** (un bloqueante y varios menores) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**. Todo lo bloqueante y lo menor se ha aplicado. **Bloqueante corregido:** al enviar desde un
borrador, `adoptNewConversation` hacía `await store.refresh()` y después seleccionaba la conversación nueva
sin volver a comprobar la época. Si el usuario cambiaba de conversación durante ese `refresh`, se le devolvía
a la nueva con los mensajes de la otra debajo; y si salía de mensajes, el store se quedaba con una
conversación activa y el contador de no leídos se rompía. Ahora recibe la época y comprueba
`epoch`/`destroyed` tras el `await`.

Otros cambios tras la revisión:
- el aviso de envío fallido desaparece en cuanto el usuario edita el texto;
- al recuperar un texto de varias líneas, el composer recalcula su altura (`fitHeight`);
- los errores de mensajes usan el `Button` compartido (`secondary`, con icono, tamaño táctil correcto), el
  mismo texto de apoyo que el resto y un estado de carga al reintentar.

- Tests en `messages.spec.ts` (6 nuevos). Los 4 primeros, **ejecutados contra el componente anterior,
  fallan todos** y pasan los 7 que ya existían; los 2 restantes (borrador y aviso al editar) se añadieron
  tras la revisión.

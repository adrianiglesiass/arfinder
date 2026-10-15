---
tag: SPECS/2026-10-fix-profile-detail-budget-label
estado: approved
stack: frontend
fecha: 2026-10-15
---

# fix-profile-detail-budget-label

Hallazgo #60 del backlog (`plan.md`, fase 20). Seguimiento anotado en
[`fix-budget-filter-direction.md`](fix-budget-filter-direction.md).

## Contexto
- `Profile.max_budget` es un único importe cuyo significado depende del tipo del perfil
  (`TypeEnum`): en `looking_for_flat` (busca piso) es el **presupuesto máximo**; en
  `looking_for_roommate` (ofrece habitación) es el **precio de la habitación**.
- El formulario de perfil ya usa esos dos textos (`step-objective.ts`: "Presupuesto máximo" /
  "Precio de la habitación"), y el panel de `/explorar` habla de "Precio máx. habitación" y
  "Presupuesto mínimo" desde la PR #308.
- El detalle de perfil (`features/profile/components/profile-info-block/profile-info-block.html`)
  muestra siempre "Presupuesto máximo" y, sin importe, "Sin límite" con el icono de infinito.

## Problema
En el perfil de alguien que ofrece una habitación, el precio aparece como "Presupuesto máximo":
quien lo visita lee un dato equivocado (parece lo que esa persona puede pagar, no lo que cobra).

## Alcance
- Etiqueta del importe según el tipo del perfil mostrado:
  - `looking_for_flat`: "Presupuesto máximo" (sin cambios).
  - `looking_for_roommate`: "Precio de la habitación" (mismo texto que el formulario).
- Sin importe (`max_budget` nulo, perfiles antiguos):
  - `looking_for_flat`: "Sin límite" con el icono de infinito (sin cambios).
  - `looking_for_roommate`: "Sin indicar", sin icono de infinito (un precio desconocido no es
    "sin límite").

## No-goals
- NO cambiar el formulario de perfil, las tarjetas, el deck ni el modelo.
- NO cambiar el formato del importe.

## Criterios de aceptación
- DADO el perfil de quien busca piso con 700 € ENTONCES el bloque dice "Presupuesto máximo" y "700 €".
- DADO el perfil de quien ofrece habitación con 450 € ENTONCES dice "Precio de la habitación" y "450 €",
  y no aparece "Presupuesto máximo".
- DADO un perfil sin importe ENTONCES quien busca piso muestra "Sin límite" y quien ofrece habitación
  "Sin indicar".

## Decisión técnica
- Un `computed` en `ProfileInfoBlock` (`budgetText`) devuelve etiqueta y texto vacío según el
  `isRoommate()` que ya existe en el componente. La plantilla solo pinta esos textos.
- Se reutiliza el texto del formulario en lugar de crear uno nuevo; no se extrae a una constante
  compartida porque son dos usos con contextos distintos (formulario y lectura).

## Plan de tests
- `profile-info-block.spec.ts` (nuevo, Vitest + TestBed): etiqueta e importe para cada tipo; texto sin
  importe para cada tipo.

## Checklist de verificación
- [ ] Frontend: `npm run format:check` y `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Build: `node scripts/set-env.js && npx ng build --configuration production`

## Resultado
Pendiente.

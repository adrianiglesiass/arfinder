---
tag: SPECS/2026-10-fix-budget-filter-mixed-list
estado: approved
stack: frontend
fecha: 2026-10-15
---

# fix-budget-filter-mixed-list

Hallazgo #61 del backlog (`plan.md`, fase 20). Continúa
[`fix-budget-filter-direction.md`](fix-budget-filter-direction.md) (PR #308).

## Contexto
- Desde la PR #308 el importe se compara en el sentido que corresponde a lo que se lista:
  `budget_max` (precio de habitación `<=` X) para habitaciones y `budget_min` (presupuesto `>=` X)
  para personas que buscan piso. El sentido lo decide "¿Qué busca?" o, sin tipo elegido, el perfil
  propio (`features/search-profile/budget-filter.ts`).
- Sin tipo elegido la lista mezcla los dos tipos y el backend aplica el importe a todos los perfiles,
  sea cual sea su tipo. El panel lo avisa con "Pensado para…".
- Los filtros viven en `ProfileSearchService` (`core/profile-search/`), que los lee y escribe en la URL.
  El panel (`search-filters`) y los chips de `search-profile` los cambian con `updateFilter(s)`.

## Problema
Con la lista mezclada, el importe filtra también al tipo equivocado: el mínimo de quien ofrece una
habitación (pensado para personas que buscan piso) oculta además las habitaciones más baratas, y el
precio máximo de quien busca piso oculta a las personas con más presupuesto. El resultado es una lista
recortada sin motivo.

## Comportamiento decidido
- **Un importe siempre va con su tipo**: cada parámetro solo tiene sentido para un tipo de perfil.
  - `budget_min` → "Busca piso" (`looking_for_flat`).
  - `budget_max` → "Busca compañero" (`looking_for_roommate`, habitaciones).
  Es la misma regla con la que la PR #308 elige el sentido, leída al revés.
- **Fijar un importe sin tipo elegido** selecciona automáticamente el tipo del sentido en uso, en la
  misma actualización (una sola búsqueda). Así el filtro nunca se aplica al tipo equivocado.
- **Quitar el importe** (slider al extremo neutro o chip del importe) NO quita el tipo.
- **Quitar el tipo con un importe puesto** (chip de "¿Qué busca?" en el panel o chip activo) quita
  también el importe: sin tipo la lista vuelve a mezclar los dos y el importe no se podría aplicar
  bien. Volver a fijarlo vuelve a elegir el tipo.
- **Enlace con importe y sin tipo** (`/explorar?budget_min=600`): se resuelve al tipo del parámetro y la
  URL se reescribe con él (`profile_type=looking_for_flat`).
- **Texto de ayuda**: "Pensado para…" deja de ser exacto (el filtro ya no se aplica a la lista mezclada).
  Sin tipo elegido, bajo la etiqueta se avisa de lo que pasará al fijar el importe:
  "Al fijarlo verás solo perfiles que buscan piso" (`min`) o "Al fijarlo verás solo habitaciones"
  (`max`). Con tipo elegido no se muestra nada (sin cambios).
- Sin cambios: el sentido elegido por "¿Qué busca?", el traslado del importe al cambiar de tipo, los
  extremos neutros y los textos de etiqueta y chip.

## Alcance
- `ProfileSearchService`: una regla única (`withBudgetType`) que se aplica al leer la URL y en cada
  `updateFilters`. Cubre panel, chips y enlaces sin duplicar lógica.
- `budget-filter.ts`: nuevo texto de ayuda.
- Tests del servicio y del panel.

## No-goals
- NO cambiar el backend ni el contrato de la API.
- NO cambiar el tipo por defecto de "¿Qué busca?" cuando no hay importe.
- NO corregir enlaces con tipo e importe contradictorios (`profile_type=looking_for_flat&budget_max=…`):
  la PR #308 ya decide que el panel describe el parámetro, y el panel nunca produce esa combinación.

## Criterios de aceptación
- DADO quien ofrece habitación sin tipo elegido CUANDO fija 600 ENTONCES los filtros quedan
  `{ profile_type: 'looking_for_flat', budget_min: 600 }` con una sola búsqueda.
- DADO quien busca piso sin tipo elegido CUANDO fija 600 ENTONCES quedan
  `{ profile_type: 'looking_for_roommate', budget_max: 600 }`.
- DADO un tipo e importe puestos CUANDO se quita el importe ENTONCES el tipo se conserva.
- DADO un tipo e importe puestos CUANDO se quita el tipo ENTONCES desaparece también el importe.
- DADO `/explorar?budget_min=600` ENTONCES los filtros son `{ budget_min: 600, profile_type:
  'looking_for_flat' }` y la URL incluye `profile_type=looking_for_flat`; con `budget_max` el tipo es
  `looking_for_roommate`.
- DADO un tipo ya elegido CUANDO se fija un importe ENTONCES el tipo no cambia.
- DADO el panel sin tipo elegido ENTONCES el texto de ayuda dice "Al fijarlo verás solo perfiles que
  buscan piso" o "Al fijarlo verás solo habitaciones" según el sentido, y desaparece con tipo elegido.

## Decisión técnica
- La regla vive en el servicio porque es un invariante del estado de filtros, no de un componente:
  así la respetan el panel, los chips de `search-profile` y los enlaces sin repetirla. El servicio
  está en `core` y no importa de `features`: la correspondencia parámetro → tipo es un mapa de dos
  entradas en el propio servicio.
- `withBudgetType(next, patch)` es una función pura: si hay importe y no hay tipo, quita el importe
  cuando el cambio vacía el tipo y, si no, añade el tipo del parámetro. `updateFilters` la aplica antes
  de comparar, de modo que sigue habiendo una sola escritura del signal (una búsqueda, una URL).
- Alternativa descartada: hacerlo en `SearchFilters.commitBudget`. No cubría los enlaces ni el chip
  activo de tipo, y obligaba a repetir la regla en `search-profile`.
- Alternativa descartada: impedir quitar el tipo mientras hay importe. Deja un chip que no responde.

## Plan de tests
- `profile-search.service.spec.ts`: importe sin tipo añade el tipo (ambos sentidos) con una búsqueda;
  tipo elegido se respeta; quitar el importe conserva el tipo; quitar el tipo quita el importe;
  enlaces con `budget_min` o `budget_max` sin tipo se resuelven y reescriben la URL.
- `search-filters.spec.ts`: texto de ayuda nuevo según el sentido y oculto con tipo elegido.

## Checklist de verificación
- [ ] Frontend: `npm run format:check` y `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Build: `node scripts/set-env.js && npx ng build --configuration production`

## Resultado
Pendiente.

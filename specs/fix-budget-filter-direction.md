---
tag: SPECS/2026-10-fix-budget-filter-direction
estado: approved
stack: ambos
fecha: 2026-10-15
---

# fix-budget-filter-direction

Hallazgo #52 del backlog (`plan.md`, fase 18).

## Contexto
- El perfil guarda un único importe mensual en `Profile.max_budget` (`backend/app/models/profile.py`).
  Su significado depende del tipo del perfil, como ya muestra el formulario (`step-objective.ts`):
  - `looking_for_flat` (busca piso): **presupuesto máximo** que puede pagar.
  - `looking_for_roommate` (ofrece habitación): **precio de la habitación**.
- `GET /profiles` acepta `budget_max` y filtra `Profile.max_budget <= budget_max`
  (`profile_repository.search_profiles`), sin mirar el tipo.
- En `/explorar`, el panel de filtros (`search-filters`) muestra siempre el slider "Presupuesto máximo"
  y el chip "Hasta X €", y siempre envía `budget_max`. El filtro "¿Qué busca?" (`profile_type`) elige el
  tipo de perfil que se lista.
- `/explorar` está detrás de `profileGuard`, que carga el perfil propio en `ProfileService.currentProfile`.

## Problema
El filtro solo tiene sentido para quien busca piso. Quien ofrece una habitación por P € quiere ver a
personas que **pueden pagar al menos P**, pero el filtro le devuelve las que tienen un presupuesto
**como mucho** P: excluye justo a quienes pueden pagar más y deja a quienes no llegan. Confirmado en
código: la comparación es siempre `<=` y la UI no cambia según quién busca ni qué se busca.

## Comportamiento decidido
Un mismo número, "el alquiler de referencia" X, se compara en el sentido que corresponde a lo que se lista:

| Se listan… | Significado de `max_budget` en esos perfiles | Filtro | Parámetro |
|---|---|---|---|
| Habitaciones (`looking_for_roommate`) | precio de la habitación | precio `<=` X | `budget_max` (existente) |
| Personas que buscan piso (`looking_for_flat`) | presupuesto máximo | presupuesto `>=` X | `budget_min` (nuevo) |

- **Sentido del filtro en la UI** (`min` o `max`):
  1. Si "¿Qué busca?" está elegido, manda el tipo que se lista: "Busca piso" → `min`; "Busca compañero" → `max`.
  2. Si no, se deduce del perfil propio: quien ofrece habitación busca personas → `min`; quien busca piso
     busca habitaciones → `max`.
  3. Sin perfil propio cargado → `max` (comportamiento actual).
  4. Si la URL ya trae `budget_min` o `budget_max`, el panel muestra el sentido de ese parámetro, para no
     describir un filtro distinto del que se está aplicando.
- **Textos**:
  - `max`: etiqueta "Precio máximo", sin filtro "Sin límite", chip "Hasta X €".
  - `min`: etiqueta "Presupuesto mínimo", sin filtro "Sin mínimo", chip "Presupuesto desde X €".
- **Slider** (200–1500, paso 50, igual que hoy): en `max` el extremo derecho (1500) significa sin filtro;
  en `min` lo es el extremo izquierdo (200), que es el mínimo que permite el formulario de perfil.
- **Cambio de sentido**: al cambiar "¿Qué busca?" con un importe puesto, el importe se conserva y pasa al
  parámetro del nuevo sentido (sigue siendo el mismo alquiler de referencia). Nunca se envían los dos.
- **Igualdad**: un precio igual al presupuesto encaja en ambos sentidos (`<=` y `>=` inclusivos).
- **Perfiles sin importe** (`max_budget` nulo): no aparecen cuando hay filtro de importe en cualquiera de los
  dos sentidos (un importe desconocido no cumple la condición), igual que hoy con `budget_max`.

## Alcance
- **Backend**: query param `budget_min: int | None` en `GET /profiles` → `profile_service` →
  `profile_repository` (`Profile.max_budget >= budget_min`). `budget_max` no cambia.
- **Contrato**: regenerar `frontend/src/app/core/api/api.types.ts` con `npm run generate:types`.
- **Frontend estado/URL**: `ProfileSearchService` lee y escribe `budget_min` en la URL y ofrece
  `updateFilters(patch)` para cambiar varias claves en una sola actualización.
- **Frontend lógica**: `features/search-profile/budget-filter.ts` (funciones puras): sentido del filtro,
  parámetro por sentido y textos.
- **Frontend UI**: `search-filters` usa el sentido para etiqueta, texto sin filtro, extremo neutro del slider
  y parámetro; `search-profile` muestra el chip de `budget_min`.
- Tests backend y frontend.

## No-goals
- NO cambiar el modelo ni separar `max_budget` en dos columnas (ni migraciones).
- NO cambiar el formulario de perfil ni las tarjetas o el detalle.
- NO cambiar el valor por defecto de "¿Qué busca?".
- NO filtrar por tipo de fila en el backend: los parámetros son explícitos y el cliente elige el sentido.

## Criterios de aceptación
- DADO `GET /profiles?budget_min=600` CUANDO hay perfiles con 500, 600 y 900 ENTONCES aparecen 600 y 900.
- DADO `GET /profiles?budget_max=600` ENTONCES aparecen 500 y 600 (sin cambios).
- DADO un perfil sin importe CUANDO se filtra con `budget_min` o `budget_max` ENTONCES no aparece; sin
  filtro de importe sí aparece.
- DADO `budget_min` combinado con `profile_type=looking_for_flat` y `city` ENTONCES se aplican todos.
- DADO quien ofrece habitación en `/explorar` sin tipo elegido CUANDO fija 600 en el slider ENTONCES se
  envía `budget_min=600`, la etiqueta es "Presupuesto mínimo" y el chip "Presupuesto desde 600 €".
- DADO quien busca piso, o "Busca compañero" elegido, ENTONCES se envía `budget_max`, la etiqueta es
  "Precio máximo" y el chip "Hasta X €".
- DADO un importe puesto CUANDO se cambia "¿Qué busca?" a un tipo con el otro sentido ENTONCES el importe
  pasa al otro parámetro y el anterior desaparece de filtros y URL.
- DADO el slider en su extremo neutro (200 en `min`, 1500 en `max`) ENTONCES no hay filtro de importe.

## Decisión técnica
- **Dos parámetros explícitos** en vez de uno cuyo sentido dependa del tipo de cada fila: cada uno es una
  comparación simple, se combina con el resto de filtros y `budget_max` mantiene su contrato. Alternativa
  descartada: `budget_max` con sentido por fila (`precio <= X` en habitaciones, `presupuesto >= X` en
  personas): resolvía las listas mezcladas sin saber quién busca, pero cambiaba el significado de un
  parámetro existente y obligaba a una etiqueta neutra poco clara.
- `budget_min` se declara igual que `budget_max` (`Query(None)`), en la misma posición del patrón
  Router → Service → Repository.
- El sentido se calcula en una función pura (`budgetDirection`) para probarla sin TestBed. El perfil propio
  se lee de `ProfileService.currentProfile` (ya cargado por `profileGuard`; no crea peticiones nuevas).
- `updateFilters` aplica el cambio de tipo y el traslado del importe en una sola escritura del signal: una
  sola búsqueda y una sola escritura de URL.

## Plan de tests
Backend (`tests/profiles/test_search.py`):
- `budget_min` incluye iguales y mayores, excluye menores; `budget_max` incluye iguales.
- Perfil sin importe excluido con `budget_min` y con `budget_max`, incluido sin filtro.
- `budget_min` + `profile_type` + `city` combinados.

Frontend:
- `budget-filter.spec.ts`: sentido por tipo elegido, por perfil propio y por defecto; prioridad del
  parámetro presente en los filtros; textos y parámetro por sentido.
- `search-filters.spec.ts`: etiqueta y parámetro enviados para quien ofrece y para quien busca; extremo
  neutro en cada sentido; traslado del importe al cambiar el tipo.
- `profile-search.service.spec.ts`: `budget_min` se lee de la URL.

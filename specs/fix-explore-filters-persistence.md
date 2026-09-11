---
tag: SPECS/2026-09-fix-explore-filters-persistence
estado: approved
stack: frontend
fecha: 2026-09-11
---

# fix-explore-filters-persistence

## Contexto
- `ProfileSearchService` (`core/profile-search/profile-search.service.ts`) escucha **todos** los
  `NavigationEnd` y en cada uno relee los filtros de la URL actual (`readFromUrl`). Además `writeToUrl`
  usa `location.replaceState`, así que el router no conoce la query de `/explorar`.
- Al pulsar una tarjeta y navegar a `/perfil/5`, la URL no tiene query: los filtros pasan a `{}`, se
  lanza una búsqueda sin filtros y el deck vuelve a la tarjeta 1. Al volver con "← Explorar"
  (`/explorar` sin query), los filtros siguen perdidos.
- `refreshIfStale` (al volver tras más de 2 minutos) llama a `resetAndLoad`, que pone `deckIndex` a 0.

## Problema
Abrir un perfil desde Explorar borra los filtros y devuelve el deck al principio, y volver a la
pestaña tras dos minutos también reinicia el deck.

## Alcance
- El listener de `NavigationEnd` solo actúa en `/explorar`:
  - con query de filtros en la URL, la aplica si difiere (enlaces compartidos y botón atrás);
  - sin query y con filtros en memoria, los vuelve a escribir en la URL en lugar de borrarlos.
- La recarga por caducidad conserva la posición del deck: tras recargar, busca el perfil que se estaba
  viendo y sitúa el deck en él; si ya no está, mantiene el índice dentro de rango.

## No-goals
- NO se persisten los filtros entre sesiones (no hay `localStorage`).
- NO se cambia el formato de la query.

## Criterios de aceptación
- DADO filtros activos en Explorar CUANDO se abre un perfil y se vuelve con "← Explorar" ENTONCES los
  filtros siguen aplicados y no se lanza una búsqueda nueva.
- DADO un enlace `/explorar?city=Madrid` ENTONCES se aplica el filtro de ciudad.
- DADO el deck en la tarjeta 15 CUANDO la búsqueda se recarga por caducidad ENTONCES sigue en el mismo
  perfil.

## Decisión técnica
- Tratar la memoria como fuente de verdad cuando la URL no trae filtros: el usuario no pidió borrarlos,
  solo navegó. La única forma de borrarlos sigue siendo "Limpiar filtros".

## Plan de tests
- `core/profile-search/profile-search.service.spec.ts`: navegar a otra ruta no cambia los filtros;
  volver a `/explorar` sin query los conserva y los escribe en la URL; `/explorar?city=X` los aplica; la
  recarga por caducidad conserva el perfil actual del deck.

## Checklist de verificación
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Frontend: `npm run build`

## Resultado

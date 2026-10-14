---
tag: SPECS/2026-09-fix-explore-filters-persistence
estado: done
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
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → BLOQUEADO** (un bloqueante y varios menores) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**. Todo lo bloqueante y lo menor se ha aplicado.

- `NavigationEnd` solo actúa en `/explorar`: aplica los filtros de la query si los hay; si no, reescribe en
  la URL los que haya en memoria. `writeToUrl` pasa el `state` actual a `replaceState` para no borrar el
  `navigationId` del router (sin eso, el botón atrás perdía el scroll de la cuadrícula).
- Recarga por caducidad **en el sitio** (`refreshInPlace`): recarga en una petición las páginas vistas, sin
  vaciar la lista. Cambios tras la revisión:
  - el perfil de referencia se toma **al llegar la respuesta**, no al lanzarla, porque si el usuario
    deslizaba durante la petición el deck volvía atrás;
  - con más de 4 páginas cargadas no se recarga en el sitio, para no recortar la lista;
  - desde "has visto todo" se mantiene esa pantalla;
  - el deck vuelve a la primera foto cuando cambia el perfil activo (antes podía quedar una carta en negro).
- `resetAndLoad` pone `isLoadingMore` a `false`: con una página en vuelo, cambiar de filtros dejaba el
  spinner "Cargando más" para siempre (defecto previo, destapado por la revisión).
- Tests en `profile-search.service.spec.ts`: navegación a otra ruta, vuelta sin query, enlace con filtros,
  recarga que conserva el perfil y spinner que no se atasca.

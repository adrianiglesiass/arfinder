---
tag: SPECS/2026-09-fix-search-session-change
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-search-session-change

## Contexto
- `ProfileSearchService` es `root` y cachea los resultados 2 minutos sin tener en cuenta quién ha
  iniciado sesión. El backend excluye el propio perfil y los bloqueos **solo** si hay usuario
  (`GET /profiles` en `app/routes/profile.py`).
- Un invitado abre `/explorar`, inicia sesión y vuelve antes de 2 minutos: `refreshIfStale` no recarga y
  ve **su propio perfil** y a quien le ha bloqueado. Lo mismo al cambiar de cuenta en la misma pestaña.

## Problema
Tras iniciar o cerrar sesión, Explorar puede mostrar resultados calculados para otro usuario, incluido
el perfil propio.

## Alcance
- `ProfileSearchService` reacciona al cambio de `AuthService.currentUser()?.id`: marca los resultados
  como caducados y, si la ruta actual es `/explorar`, recarga al momento.

## No-goals
- NO se cambia el tiempo de caducidad.

## Criterios de aceptación
- DADO resultados cargados como invitado CUANDO se inicia sesión ENTONCES la búsqueda se recarga antes de
  volver a mostrarse.
- DADO el primer valor del usuario al arrancar ENTONCES no se lanza una recarga extra.

## Decisión técnica
- Invalidar por cambio de id de usuario (y no por cualquier cambio del objeto usuario): es lo que cambia
  el resultado del backend.

## Plan de tests
- `core/profile-search/profile-search.service.spec.ts`: cambiar el usuario invalida la caché y recarga en
  `/explorar`; el valor inicial no provoca recarga.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → BLOQUEADO** (un bloqueante y varios menores) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**. Todo lo bloqueante y lo menor se ha aplicado. Cambio aplicado tras ella: **al cerrar sesión o
cambiar de cuenta se borran los filtros**. Es una regresión que introducía `fix-explore-filters-persistence`:
antes se borraban solos al pasar por `/login`, y al conservarlos, el siguiente usuario de la pestaña veía los
filtros del anterior. Se borran cuando el usuario anterior no era un invitado; de invitado a usuario se
conservan.

- `ProfileSearchService` observa `AuthService.currentUser()?.id`; el primer valor no dispara recarga.
- Tests: iniciar sesión recarga, el valor inicial no, y los filtros no pasan de una cuenta a otra.

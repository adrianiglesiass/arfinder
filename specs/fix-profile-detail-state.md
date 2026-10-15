---
tag: SPECS/2026-09-fix-profile-detail-state
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-profile-detail-state

## Contexto
- `ProfileDetail` (`features/profile/profile-detail.ts`) se reutiliza al cambiar de `/perfil/:id`
  (el router reutiliza el componente de la misma ruta). El `effect` sobre `id()` solo llama a
  `loadProfile`: no reinicia `activeDialog`, `activePhotoIndex`, `error` ni `profile`.
- `confirmBlock()` y `submitReport()` leen `this.profile()` al confirmar, no al abrir el diálogo. Con
  el diálogo abierto en el perfil 1, al navegar al perfil 2 el diálogo sigue abierto y la acción se
  aplica al 2. Además, mientras carga el 2 se sigue viendo el 1, y si su carga falla también, porque
  `@if (profile())` va antes que `@else if (error())`.
- `loadProfile()` no comprueba que la respuesta corresponda al id vigente.
- **No hay `profile-detail.spec.ts`**: la orquestación de bloqueo y reporte de la PR #299 no tiene
  tests, aunque su spec (`fix-profile-safety-actions.md`) afirmaba lo contrario. Los tests que tenía
  `ReportButton` se perdieron al eliminarlo.
- El botón "⋯" de `ProfileActionsMenu` no expone `aria-expanded`.

## Problema
El detalle de perfil puede mostrar datos o aplicar acciones del perfil anterior al cambiar de
perfil, y la lógica de bloqueo y reporte no tiene tests que la protejan.

## Alcance
- Al cambiar `id()`: cerrar el diálogo, volver a la primera foto, limpiar el error y, si el perfil
  cargado no es el nuevo, vaciarlo y mostrar el estado de carga.
- `loadProfile()` descarta respuestas y errores de un id que ya no es el vigente.
- `ProfileActionsMenu`: `aria-expanded` sincronizado con la apertura del `p-menu` (`onShow`/`onHide`).
- `features/profile/profile-detail.spec.ts` con los criterios de bloqueo y reporte.

## No-goals
- NO se cambia el diseño del detalle.

## Criterios de aceptación
- DADO el diálogo de reporte abierto en `/perfil/1` CUANDO se navega a `/perfil/2` ENTONCES el diálogo
  se cierra.
- DADO un cambio de perfil sin caché CUANDO carga ENTONCES no se ve el perfil anterior; si la carga
  falla, se ve el error.
- DADO una respuesta lenta del perfil 1 que llega después de navegar al 2 ENTONCES se ignora.
- Bloqueo: confirmar muestra toast de éxito y el menú pasa a "Desbloquear"; cancelar no llama a la
  API; un fallo muestra toast de error.
- Reporte: un fallo mantiene el diálogo abierto con toast de error; un éxito lo cierra.
- `safetyBusy` vuelve a `false` aunque el servicio rechace.

## Decisión técnica
- Reiniciar el estado en el mismo `effect` que ya reacciona a `id()`, y validar el id en
  `loadProfile` en lugar de guardar un contador aparte: el id es la fuente de verdad.

## Plan de tests
- `features/profile/profile-detail.spec.ts` (nuevo): criterios anteriores con `ProfileService`,
  `BlockService`, `ReportService` y `AuthService` simulados, espiando el `MessageService` que el
  componente provee.
- `profile-actions-menu.spec.ts`: `aria-expanded` cambia con `onShow`/`onHide`.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes, con las instrucciones de `.opencode/agent/code-reviewer.md` y `ui-ux-reviewer.md` → los dos **APROBADO CON CAMBIOS MENORES / OBSERVACIONES**, sin bloqueantes. Cambios aplicados tras ella: una acción lenta del
perfil anterior ya no cierra el diálogo que el usuario haya abierto en el perfil nuevo (solo cierra si el
perfil sigue siendo el mismo), y se añaden tests del estado intermedio de carga.

- `features/profile/profile-detail.ts`: el `effect` de `id()` reinicia diálogo, foto, error y perfil;
  `loadProfile` descarta respuestas de un id que ya no es el vigente (`isCurrentProfile`); `runExclusive`
  con `try/finally`.
- `ProfileActionsMenu`: `aria-expanded` sincronizado con `onShow`/`onHide`.
- `features/profile/profile-detail.spec.ts` (nuevo): **14 tests**. La primera tanda (11 tests),
  ejecutada contra el componente anterior, **falla exactamente en los 5 que apuntan a los bugs** (dos de
  `safetyBusy` colgado y tres del cambio de perfil) y pasa en los 6 de comportamiento que ya funcionaba.
  Los 3 restantes se añadieron tras la revisión.

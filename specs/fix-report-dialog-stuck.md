---
tag: SPECS/2026-09-fix-report-dialog-stuck
estado: approved
stack: frontend
fecha: 2026-09-11
---

# fix-report-dialog-stuck

## Contexto
- `ReportService.report()` (`core/report/report.service.ts`) captura el fallo del `POST`, pero
  `await this.blocks.refresh()` queda **fuera** del `try`. `BlockService.refresh()` solo tiene
  `try/finally`, así que un fallo de `GET /profiles/me/blocked` hace que `report()` rechace en lugar
  de devolver un `ReportResult`.
- `ProfileDetail.submitReport()` (`features/profile/profile-detail.ts`) pone `safetyBusy` a `true`,
  espera el resultado y luego lo vuelve a `false` sin `try/finally`. Si `report()` rechaza,
  `safetyBusy` se queda en `true` y `closeDialog()` sale antes de cerrar.
- Es una regresión de la PR #299: el `ReportButton` eliminado sí tenía `finally`. Lo detectaron el
  code-reviewer, el ui-ux-reviewer y la auditoría de frontend.

## Problema
Si el reporte se envía bien pero falla la recarga de bloqueados, el diálogo se queda con el spinner
y no hay forma de cerrarlo; el menú "⋯" deja de funcionar hasta salir de la ruta.

## Alcance
- `ReportService.report()`: el fallo de `refresh()` se ignora y devuelve `{ ok: true }`, porque el
  reporte ya se guardó en el servidor.
- `ProfileDetail`: `confirmBlock`, `unblock` y `submitReport` restauran `safetyBusy` en un `finally`.

## No-goals
- NO se cambia el aspecto del diálogo (su pie fijo y el foco van en `fix/ux-a11y`, #46).

## Criterios de aceptación
- DADO un reporte enviado con éxito y un `GET /profiles/me/blocked` que falla CUANDO termina ENTONCES
  el diálogo se cierra y se muestra el toast de éxito.
- DADO cualquier error inesperado durante una acción CUANDO termina ENTONCES `safetyBusy` vuelve a
  `false` y el diálogo se puede cerrar.

## Decisión técnica
- Devolver éxito aunque falle la recarga: la acción del usuario se completó, y la lista de bloqueados
  se volverá a cargar en la siguiente visita a `/bloqueados`.

## Plan de tests
- `core/report/report.service.spec.ts`: el fallo de `refresh()` devuelve `{ ok: true }`.
- `features/profile/profile-detail.spec.ts` (de `fix-profile-detail-state`): `safetyBusy` vuelve a
  `false` si el servicio rechaza.

## Checklist de verificación
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Frontend: `npm run build`

## Resultado

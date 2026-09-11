---
tag: SPECS/2026-09-fix-report-dialog-stuck
estado: done
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
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes, con las instrucciones de `.opencode/agent/code-reviewer.md` y `ui-ux-reviewer.md` → los dos **APROBADO CON CAMBIOS MENORES / OBSERVACIONES**, sin bloqueantes. Cambio aplicado tras ella: tras un reporte con
éxito se llama a `BlockService.markBlocked()` **antes** de recargar. Si la recarga falla, el perfil ya
figura como bloqueado y el menú "⋯" ofrece "Desbloquear", coherente con el toast "También hemos bloqueado
a X" (lo señalaron los dos revisores).

- `ReportService.report()`: el fallo de `refresh()` se ignora y devuelve `{ ok: true }`.
- `ProfileDetail`: las tres acciones pasan por `runExclusive`, con `safetyBusy` restaurado en `finally`.
- Tests: `report.service.spec.ts` (éxito aunque falle la recarga; marca el bloqueo; un error no marca
  nada) y `profile-detail.spec.ts` (el diálogo se puede cerrar aunque el servicio rechace).

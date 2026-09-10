---
tag: SPECS/2026-09-fix-account-deletion
estado: done
stack: backend
fecha: 2026-09-10
---

# fix-account-deletion

## Contexto
`delete_user` en `auth_service.py:27-39` borra el registro local primero y luego intenta borrar en InsForge. Si InsForge falla (timeout/red), el usuario se recrea en el siguiente login.

## Problema
Borrado local antes de InsForge + fallo silencioso = usuario reaparece. Fallo de retención de datos/GDPR.

## Alcance
- Invertir orden: borrar en InsForge primero, local después.
- Si InsForge falla, no borrar local y devolver error al cliente.
- Mantener timeout pero como hard fail, no silencioso.

## Criterios de aceptación
- DADO un usuario existente, CUANDO InsForge responde 200, ENTONCES se borra local y se devuelve 204.
- DADO un usuario existente, CUANDO InsForge falla, ENTONCES el registro local permanece y se devuelve error 502.

## Checklist de verificación
- [x] `ruff check .`
- [x] `ruff format --check .`

## Resultado
Reordenado y fortalecido borrado de cuenta.

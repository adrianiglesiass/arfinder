---
tag: SPECS/2026-09-fix-report-block-order
estado: done
stack: backend
fecha: 2026-09-11
---

# fix-report-block-order

## Contexto
- `report_service.report_profile` (`app/services/report_service.py`) guarda el reporte con
  `report_repository.add` (que hace `commit`) y **después** llama a `block_service.block_profile`.
- Si el bloqueo falla (error de BD, o el perfil se borra entre medias), el cliente recibe un 500 con el
  reporte ya guardado. Al reintentar, `add` responde 409 `USER_REPORT_ALREADY_EXISTS` y el bloqueo no
  llega a aplicarse nunca.
- `block_profile` ya es idempotente para este caso: `report_service` absorbe `BlockAlreadyExistsError`.

## Problema
Un fallo puntual al reportar deja al usuario reportado **sin bloquear para siempre**, justo en la
acción que usa alguien que se siente acosado.

## Alcance
- Invertir el orden: primero bloquear (absorbiendo `BlockAlreadyExistsError`) y después guardar el
  reporte.

## No-goals
- NO se unifica todo en una única transacción: los repositorios hacen `commit` internamente, por la
  convención de la sección 4 de la guía SDD.

## Criterios de aceptación
- DADO un fallo al guardar el reporte CUANDO se reintenta ENTONCES el reintento guarda el reporte y el
  usuario queda bloqueado.
- DADO un fallo al bloquear ENTONCES no se guarda ningún reporte, así que el reintento no da 409.
- DADO el flujo normal ENTONCES el resultado es el mismo que hoy: reporte guardado y usuario bloqueado.

## Decisión técnica
- Con el orden invertido, cualquier fallo deja un estado desde el que el reintento completa la acción:
  el bloqueo es idempotente y el reporte es lo último en escribirse.

## Plan de tests
- `tests/profiles/test_reports.py`: si falla el bloqueo, no queda reporte y el reintento funciona; si
  falla el guardado del reporte tras bloquear, el reintento lo guarda.

## Checklist de verificación
- [x] Backend: `ruff check .`
- [x] Backend: `ruff format --check .`
- [x] Backend: `pytest`

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes. Cambio aplicado tras ella: se comprueba si el
reporte ya existe **antes** de bloquear. Sin eso, el orden nuevo introducía un efecto no pedido: si A
reportaba a B, lo desbloqueaba y lo reportaba otra vez, B volvía a quedar bloqueado en silencio y la
respuesta seguía siendo 409, con la interfaz mostrándolo desbloqueado.

- `report_service.report_profile`: comprueba el duplicado, bloquea (absorbiendo
  `BlockAlreadyExistsError`) y después guarda el reporte.
- Tests en `tests/profiles/test_reports.py`: si falla el bloqueo no queda reporte y el reintento funciona;
  si falla el guardado tras bloquear, el reintento lo guarda (**los dos fallan con el orden anterior**);
  y un reporte duplicado no vuelve a bloquear.

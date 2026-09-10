---
tag: SPECS/2026-09-fix-photo-reorder-and-conflict
estado: approved
stack: backend
fecha: 2026-09-10
---

# fix-photo-reorder-and-conflict

## Contexto
`PATCH /profiles/me/photos/reorder` reordena fotos vía `profile_photo_repository.reorder_photos`, que desplaza `order` con un offset y reasigna 0..n-1. El esquema `_PhotoReorder` tiene `max_length=50` pero no valida que los ids cubran todas las fotos del perfil ni que pertenezcan a él; los que no matchean se ignoran en silencio. `PATCH /profiles/me/photos/{id}` permite asignar `order` sin `ge=0` y, si colisiona con otra foto, falla con `IntegrityError` 500 por el `UniqueConstraint(profile_id, order)`.

## Problema
Reorder concurrente con `create_profile_photo` (que ya usa `pg_advisory_xact_lock`) o con otro reorder puede romper la unicidad de `order`. Reordenar con ids ajenos/incompletos da estados inconsistentes en silencio. Asignar un `order` ya ocupado responde 500 en vez de un 409.

## Alcance
- `reorder_photos`: tomar `pg_advisory_xact_lock` (misma key que `_get_next_photo_order_locked`).
- Validar en el servicio que `set(ordered_ids) == set(ids de fotos del perfil)` antes de reordenar → si no, 400.
- `_PhotoUpdate.order` con `ge=0`.
- Capturar `IntegrityError` al actualizar `order` → rollback y 409.

## No-goals
- No migrar datos ni añadir columnas.
- No cambiar el modelo de respuesta de fotos.

## Criterios de aceptación
- DADO un reorder concurrente con otro reorder o con un upload, CUANDO ambos se ejecutan, ENTONCES el orden final es consistente y sin `IntegrityError`.
- DADO `ordered_ids` que no coinciden con las fotos del perfil, CUANDO se llama al reorder, ENTONCES responde 400.
- DADO `order=-1` en `PATCH /profiles/me/photos/{id}`, ENTONCES responde 422.
- DADO `order` ya ocupado por otra foto, CUANDO se intenta asignar, ENTONCES responde 409.

## Decisión técnica
- Advisory lock reutilizando la key `profile_id` (consistente con `_get_next_photo_order_locked`).
- Nueva excepción `PhotoReorderValidationError` (400) y `PhotoOrderConflictError` (409) en `app/core/exceptions/photo.py`.
- La validación de ids vive en `profile_photo_service.reorder` (orquestación); el lock y la escritura en el repo.

## Plan de tests
- `tests/profiles/test_photo_order.py`: reorder con ids incompletos → 400.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest --tb=short`

## Resultado
Pendiente.
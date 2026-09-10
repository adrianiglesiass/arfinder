---
tag: SPECS/2026-09-fix-email-takeover-keeps-profile
estado: approved
stack: backend
fecha: 2026-09-10
---

# fix-email-takeover-keeps-profile

## Contexto
`app/core/auth_utils.get_or_create_local_user` vincula un usuario de InsForge con su email. Si un login con el mismo email trae un `insforge_id` distinto al ya registrado (email retomado por otra cuenta), el código actual borra el perfil local existente (`profile_repository.delete_profile`) antes de relinkear → pérdida de datos (fotos, preferencias, conversaciones vía cascade).

## Problema
El takeover de email destruye el perfil local, perdiendo fotos y datos del usuario original.

## Alcance
- En `get_or_create_local_user`, eliminar la rama que borra el perfil.
- Ante conflicto de `insforge_id`: loguear `warning` con el detalle y relinkear conservando el perfil.
- En el flujo de suscripción websocket (`realtime.py`), el takeover ya no puede soltar excepciones de borrado: se mantiene la cobertura `except Exception` existente.

## No-goals
- NO implementar un flujo de confirmación/fusión de cuentas (requiere UX y endpoint nuevos; va en otra feature).
- NO cambiar cómo se crea un usuario nuevo o se relinkea un email sin `insforge_id`.

## Criterios de aceptación
- DADO un usuario local con perfil y un login InsForge que trae un `insforge_id` distinto para el mismo email, CUANDO se llama a `get_or_create_local_user`, ENTONCES el perfil se conserva y el usuario queda relinkeado al nuevo `insforge_id`.

## Decisión técnica
- Se sustituye la destrucción por logging estructurado y relinkeo; conservar datos es la opción segura por defecto frente a un takeover cuyo flujo de confirmación aún no existe.

## Plan de tests
- `tests/auth/test_service.py`: takeover con email distinto conserva el perfil.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest --tb=short`

## Resultado
Pendiente.
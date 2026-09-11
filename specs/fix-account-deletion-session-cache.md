---
tag: SPECS/2026-09-fix-account-deletion-session-cache
estado: done
stack: backend
fecha: 2026-09-11
---

# fix-account-deletion-session-cache

## Contexto
- `validate_insforge_token` (`app/core/security.py`) guarda en memoria cada sesión validada durante
  120 s (`_token_cache`, indexada por el hash del token).
- `DELETE /auth/me` → `auth_service.delete_user` borra el usuario en InsForge y en la BD local, pero
  **no toca esa caché**.
- `get_current_user` usa `get_or_create_local_user`, que crea el usuario local si no existe.
- Resultado: durante hasta 120 s tras borrar la cuenta, cualquier petición o reconexión del WebSocket con
  un token ya cacheado (del mismo dispositivo o de otro) pasa la validación y **recrea el usuario local**.
  Es justo lo que `specs/fix-account-deletion.md` quería evitar.

## Problema
Tras borrar su cuenta, un usuario puede reaparecer en la BD por una petición en vuelo o por otra
pestaña o dispositivo.

## Alcance
- `security.forget_user_sessions(insforge_user_id)`: elimina de la caché todas las sesiones cuyo usuario
  sea ese.
- `auth_service.delete_user` la llama tras borrar en InsForge.

## No-goals
- NO se cambia la duración de la caché.
- NO se revocan tokens en InsForge: el borrado del usuario allí ya los invalida.

## Criterios de aceptación
- DADO un usuario con dos tokens cacheados CUANDO borra su cuenta ENTONCES ninguno de los dos está ya
  en la caché, y la siguiente validación vuelve a consultar a InsForge (que ya no lo reconoce).
- DADO otro usuario con sesiones cacheadas ENTONCES las suyas siguen en la caché.

## Decisión técnica
- Purgar por usuario y no por token: el borrado se pide con un token, pero el usuario puede tener otros
  cacheados en otros dispositivos.

## Plan de tests
- `tests/auth/test_session_cache.py` (nuevo): `forget_user_sessions` borra las sesiones del usuario y
  deja las de otros; `delete_user` la invoca con el `insforge_id` del usuario.

## Checklist de verificación
- [x] Backend: `ruff check .`
- [x] Backend: `ruff format --check .`
- [x] Backend: `pytest`

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes. Queda documentada una ventana de carrera
mínima que la revisión calificó de *nicety*: una validación que ya estaba en curso contra InsForge antes
del borrado podría volver a cachear la sesión justo después de purgarla. Cerrarla exigiría mantener una
lista temporal de usuarios borrados; no se hace en este cambio.

- `security.forget_user_sessions(insforge_user_id)` purga todas las sesiones del usuario, comparando ids
  como `str`; `auth_service.delete_user` la llama tras borrar en InsForge y antes de borrar en local.
- `tests/auth/test_session_cache.py` (nuevo): 3 tests.

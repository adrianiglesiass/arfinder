---
tag: SPECS/2026-09-fix-action-rate-limits
estado: done
stack: backend
fecha: 2026-09-11
---

# fix-action-rate-limits

## Contexto
- Tras `fix-rate-limit-per-client` (PR #300), `app/core/rate_limit.py` limita por cliente la búsqueda,
  `/cities/*`, la subida de fotos (por IP) y el envío de mensajes (por usuario).
- Sin límite siguen:
  - `POST /conversations`: recorriendo `other_user_id` se puede saber qué ids existen (404 frente a 201)
    y cada destinatario nuevo recibe un evento `conversation_created`, lo que permite hacer spam a toda
    la base de usuarios.
  - `POST`/`DELETE /profiles/{id}/block`, `POST /profiles/{id}/report` y `POST`/`DELETE
    /profiles/{id}/favorite`.

## Problema
Un usuario autenticado puede automatizar crear conversaciones con todo el mundo, o disparar bloqueos,
reportes y favoritos en masa.

## Alcance
- Nuevo `action_rate_limiter` por usuario (30 acciones por minuto) en `app/core/rate_limit.py`,
  reutilizando `SlidingWindowLimiter`.
- Se aplica a `POST /conversations`, a bloquear y desbloquear, a reportar y a marcar y desmarcar favorito.

## No-goals
- NO se cambian los límites existentes.

## Criterios de aceptación
- DADO un usuario que hace 30 de esas acciones en un minuto CUANDO hace la 31 ENTONCES recibe 429.
- DADO otro usuario ENTONCES su límite es independiente.
- DADO el entorno de tests ENTONCES el limitador no actúa, como los demás.

## Decisión técnica
- Por usuario, no por IP: son acciones autenticadas y así un grupo de usuarios tras la misma IP (una
  red de universidad o de empresa) no se penaliza entre sí.

## Plan de tests
- `tests/core/test_rate_limit.py`: `action_rate_limiter` rechaza la acción 31 de un usuario y no afecta a
  otro (con `ENVIRONMENT` distinto de `testing` durante el test).

## Checklist de verificación
- [x] Backend: `ruff check .`
- [x] Backend: `ruff format --check .`
- [x] Backend: `pytest`

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes. Cambio aplicado tras ella: **dos contadores
separados** en lugar de uno compartido. Con uno solo, marcar y desmarcar favoritos deprisa agotaba el
límite y dejaba sin poder bloquear o reportar, que son justo las acciones de seguridad.

- `action_rate_limiter` (30/min por usuario): `POST /conversations` y favoritos.
- `safety_rate_limiter` (20/min por usuario): bloquear, desbloquear y reportar.
- Tests en `tests/core/test_rate_limit.py`: las 6 rutas devuelven 429 al superar el límite, el límite es
  por usuario, y el spam de favoritos no afecta a bloquear.

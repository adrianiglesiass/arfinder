---
tag: SPECS/2026-09-fix-block-exclusion-limit
estado: done
stack: backend
fecha: 2026-09-11
---

# fix-block-exclusion-limit

## Contexto
- `block_repository.list_blocked_user_ids` y `list_blocker_user_ids` tienen `limit=200` por defecto.
  La spec de F4 (`specs/feat-user-block.md`) pone ese límite para el **listado** de
  `GET /profiles/me/blocked` ("NO paginación (limit 200 como favoritos)").
- `block_service.excluded_user_ids` reutiliza esas dos funciones con el límite por defecto para
  construir la exclusión de la búsqueda (`GET /profiles`) y de favoritos (`favorite_service`).

## Problema
Un usuario bloqueado por más de 200 personas, que es justo el caso de un acosador, vuelve a ver en la
búsqueda a las más antiguas. La exclusión bidireccional que promete F4 se rompe en el caso de abuso.

## Alcance
- `list_blocked_user_ids` y `list_blocker_user_ids` aceptan `limit: int | None`; con `None` no limitan.
- `excluded_user_ids` pide las listas sin límite. El listado de `/profiles/me/blocked` conserva sus 200.

## No-goals
- NO se reescribe la búsqueda con una subconsulta `NOT EXISTS`. Con una lista de ids basta para el
  volumen actual; queda anotado por si crece.

## Criterios de aceptación
- DADO un usuario bloqueado por 201 personas CUANDO busca ENTONCES no ve a ninguna de ellas.
- DADO un usuario que ha bloqueado a 201 ENTONCES `GET /profiles/me/blocked` sigue devolviendo 200.

## Decisión técnica
- Separar el límite del listado del de la regla de negocio, sin tocar la consulta de búsqueda.

## Plan de tests
- `tests/profiles/test_blocks.py`: con 201 bloqueos, `excluded_user_ids` los contiene todos; el listado
  sigue limitado.

## Checklist de verificación
- [x] Backend: `ruff check .`
- [x] Backend: `ruff format --check .`
- [x] Backend: `pytest`

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes.

- `limit: int | None` en `list_blocked_user_ids` y `list_blocker_user_ids`; `excluded_user_ids` pide
  `limit=None`. El listado de `/profiles/me/blocked` conserva sus 200.
- Tests en `tests/profiles/test_blocks.py`: con 201 bloqueos la exclusión los contiene todos
  (**con el servicio anterior: `assert 200 == 201`**) y el listado sigue en 200.

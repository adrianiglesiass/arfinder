---
tag: SPECS/2026-09-fix-websocket-db-session-scope
estado: approved
stack: backend
fecha: 2026-09-11
---

# fix-websocket-db-session-scope

## Contexto
- `app/routes/realtime.py` (`realtime_endpoint`) abre `db = SessionLocal()` al conectar, ejecuta
  `get_or_create_local_user(db, ...)` y reutiliza esa sesión para cada `subscribe`
  (`_is_participant`). Solo la cierra al desconectar. Por el *autobegin* de SQLAlchemy 2.0, tras la
  primera consulta la transacción queda abierta: cada socket retiene una conexión del pool en estado
  *idle in transaction* durante toda su vida.
- El pool (`app/db/database.py`) admite `pool_size=20` + `max_overflow=20` = 40 conexiones, con
  `pool_timeout=30`. Con unas 40 pestañas abiertas, o 40 sockets abiertos con un mismo token (no hay
  límite por usuario), la siguiente petición espera 30 s y falla.
- `get_current_user` y `get_current_user_optional` (`app/core/dependencies.py`) son `async` y llaman
  a `get_or_create_local_user` (SQL síncrono) directamente, **dentro del event loop**: mientras una
  consulta espera, se bloquean todas las demás peticiones y el realtime. Con el pool agotado, el
  bloqueo dura hasta 30 s.

## Problema
Un número moderado de pestañas abiertas agota el pool de la BD y congela toda la API, y cada
petición autenticada bloquea el event loop mientras consulta la BD.

## Alcance
- `realtime_endpoint`: sin sesión de larga duración. La resolución del usuario y cada comprobación de
  participante abren y cierran su propia sesión dentro de un hilo (`run_in_threadpool`).
- `get_current_user` y `get_current_user_optional`: `get_or_create_local_user` se ejecuta con
  `run_in_threadpool`.

## No-goals
- NO se limita el número de sockets por usuario.
- NO se cambia el tamaño del pool.

## Criterios de aceptación
- DADO un WebSocket autenticado y suscrito a una conversación CUANDO sigue abierto ENTONCES no retiene
  ninguna conexión del pool (`engine.pool.checkedout()` vuelve al valor previo).
- DADO un `subscribe` a una conversación ajena ENTONCES sigue respondiendo `forbidden`.
- DADO un token válido CUANDO se usa en una ruta protegida ENTONCES `get_current_user` devuelve el
  usuario como hasta ahora.

## Decisión técnica
- Sesiones cortas por operación en lugar de una por socket: el socket puede vivir horas y la BD solo
  hace falta unos milisegundos al autenticar y al suscribirse.
- `run_in_threadpool` es el mecanismo que ya usa FastAPI para las rutas `def`, y es el que la
  convención de la sección 4 de la guía SDD pide para el SQL síncrono.

## Plan de tests
- `tests/realtime/test_ws_session.py` (nuevo): con la validación de token simulada, un socket
  suscrito no retiene conexiones del pool; `subscribe` a una conversación ajena responde `forbidden`;
  un token inválido cierra con 1008.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest`

## Resultado

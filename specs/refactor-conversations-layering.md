---
tag: SPECS/2026-09-refactor-conversations-layering
estado: done
stack: backend
fecha: 2026-09-10
---

# refactor-conversations-layering

## Contexto
- `app/routes/conversations.py` es un router de **203 líneas** que mezcla varias responsabilidades
  (mapping de respuestas, broadcast realtime, acceso directo a repositorios).
- La convención del repo (SDD §4 y `docs/architecture/backend.md`) es **Router → Service → Repository**:
  routers delgados que solo enrutan y delegan, servicios con la lógica de negocio, repos de acceso a datos.
- Ya existen servicios con lógica reutilizable que el router ignora
  (`message_service.get_conversation_history`, `message_service.mark_conversation_messages_as_read`).

## Problema
1. **Router inflado**: `conversations.py` construye la respuesta (`_get_other_user_summary`,
   `_build_conversation_response`) — responsabilidad de presentación que debería vivir en el servicio —
   y `list_conversations` **duplica ese mismo mapping inline**.
2. **Capa Service saltada**: el router importa y llama a `message_repository` directamente,
   en vez de usar los servicios de mensajes que ya encapsulan esa lógica con auth.
3. **Patrón duplicado**: la detección de "conversación nueva" + broadcast `conversation_created`
   aparece dos veces (`POST ""` y `POST /with/{uid}/messages`), con bloques `_persist` casi idénticos.

## Alcance
- Mover el **response-mapping** (participant summary, last_message, unread_count, orden por actividad)
  de `app/routes/conversations.py` a `app/services/conversation_service.py`.
- Añadir funciones de servicio que devuelvan `(entidad, was_new)` para encapsular el patrón
  "detectar nuevo + crear" y "enviar mensaje creando conversación si falta".
- Dejar el router delgado: que las rutas de mensajes de conversación reutilicen
  `message_service.get_conversation_history` y `message_service.mark_conversation_messages_as_read`.
- Eliminar del router los imports a `app.repositories.message_repository` y
  `app.repositories.conversation_repository`.

## No-goals
- NO cambiar el contrato de la API: mismos endpoints, métodos, status codes y schemas de respuesta.
- NO tocar `app/core/realtime.py` (ConnectionManager/PostgresNotifyListener) ni `app/routes/realtime.py`.
- NO tocar otros routers (`auth`, `profile`, `cities`) — ya son delgados y de referencia.
- NO migraciones ni cambios de modelo/schema.
- NO tocar frontend (el contrato no cambia, `api.types.ts` no se regenera).

## Criterios de aceptación
- DADO un `GET /conversations` con N conversaciones CUANDO el cliente lo llama
  ENTONCES devuelve las mismas respuestas que hoy, **ordenadas por última actividad desc**.
- DADO un `POST /conversations` o `POST /conversations/with/{uid}/messages` CUANDO no existía
  conversación previa ENTONCES se emite `conversation_created`; si ya existía, NO se emite.
- DADO `GET /conversations/{id}/messages` y `PATCH /conversations/{id}/read`
  CUANDO los invoca un usuario ENTONCES validan acceso a la conversación igual que hoy (404/403).
- DADO el código refactorizado CUANDO se inspecciona `app/routes/conversations.py`
  ENTONCES no importa ningún `repositories` y no construye `ConversationResponse` más que vía servicio.
- DADO cualquier endpoint de conversaciones CUANDO se ejecutan los tests existentes
  ENTONCES siguen pasando sin cambios semánticos.

## Decisión técnica
Capas: las funciones nuevas viven en **servicios** (sync, `db: Session` primero); el router
sigue siendo **async** solo donde hoy usa `run_in_threadpool` y conserva el broadcast realtime
(efecto lateral async, fuera de la capa de servicio).

En `app/services/conversation_service.py`:
- `build_conversation_responses(db, conversations, current_user_id) -> list[ConversationResponse]`
  — batch: `get_last_messages_for_conversations` + `get_unread_counts_for_conversations`,
  ordena por `last.sent_at or conv.created_at` desc y mapea cada conversación.
- `build_conversation_response(db, conversation, current_user_id) -> ConversationResponse`
  — delegación a la versión batch (lista de uno). `_get_other_user_summary` pasa a ser helper privado.
- `create_or_get_conversation_with_status(db, current_user_id, other_user_id) -> tuple[Conversation, bool]`
  — `was_new = not get_conversation_between_users(...)`; si es nuevo usa `get_or_create_conversation`
  (que ya maneja la carrera con IntegrityError). Mismo semántica que el router actual.
- `send_message_with_status(db, current_user_id, recipient_user_id, content) -> tuple[Message, bool]`
  — consulta si existe la conversación antes, luego llama a `send_message_to_user` (reutiliza).
- `list_my_conversation_responses(db, current_user_id) -> list[ConversationResponse]`
  — `list_my_conversations` + `build_conversation_responses`.

En `app/routes/conversations.py` (delgado):
- `POST ""` → threadpool(`create_or_get_conversation_with_status`) → `build_conversation_response` → broadcast si `was_new`.
- `GET ""` → `list_my_conversation_responses`.
- `GET /{id}` → `get_conversation_or_raise` + `build_conversation_response`.
- `GET /{id}/messages` → `message_service.get_conversation_history(db, conversation_id, current_user.id, limit, before_id)`.
- `PATCH /{id}/read` → `message_service.mark_conversation_messages_as_read(db, conversation_id, current_user.id)`.
- `POST /{id}/messages` → sin cambios (`message_service.send_message`).
- `POST /with/{uid}/messages` → threadpool(`send_message_with_status`) → broadcast si `was_new`.

`app/services/message_service.py` no requiere cambios (servicios ya existentes se reutilizan).
Los schemas (`ConversationResponse`, `ParticipantSummary`, `LastMessageSummary`) no cambian.

## Plan de tests
`tests/conversations/test_service.py` (unit, mismo patrón que los existentes):
- `test_create_or_get_with_status_is_new_then_existing` — primera llamada `was_new=True`, segunda `False`.
- `test_send_message_with_status_creates_conversation_and_flags_new` — devuelve mensaje + `was_new`.
- `test_build_conversation_responses_orders_by_last_activity` — conversación con mensaje reciente primero
  (verifica orden desc).
- Se mantienen verdes los tests existentes (simetría, `UserNotFoundError`).

## Checklist de verificación
- [ ] Backend: `make lint` y `make format-check` (ruff check / ruff format --check)
- [ ] Backend: `make test` (pytest con override de `DATABASE_URL` local: compose `db-test`)

## Resultado
- El router `app/routes/conversations.py` quedó delgado: sin imports a `repositories`, sin construir
  respuestas ni mapear participantes (todo delegado a `conversation_service`/`message_service`).
- `conversation_service.py` ganó `build_conversation_response(s)`, `_get_other_user_summary` (privado),
  `create_or_get_conversation_with_status`, `send_message_with_status` y `list_my_conversation_responses`.
- Rutas de mensajes reutilizan `message_service.get_conversation_history` / `mark_conversation_messages_as_read`.
- Contrato de API intacto (mismos endpoints, status codes y response_model); semántica `was_new`+broadcast idéntica.
- Tests nuevos en `tests/conversations/test_service.py` (was_new inicial/existente, send_message detecta
  conversación nueva, orden por última actividad desc determinista).
- Revisión `code-reviewer` sin objeciones bloqueantes (1 bloqueante detectado y corregido: el test de
  orden dependía de timestamps casi idénticos; se hizo determinista con `sent_at` futuro explícito).
- Verificación: `ruff check` ✓, `ruff format --check` ✓, `pytest --tb=short` → **51 passed**.
- Commits: `git log --oneline refactor/architecture-cleanup` (PR #291).
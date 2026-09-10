---
tag: SPECS/2026-09-fix-conversation-create-consistency
estado: done
stack: backend
fecha: 2026-09-10
---

# fix-conversation-create-consistency

## Contexto
`POST /conversations` y `POST /conversations/with/{id}/messages` crean conversaciones vía `get_or_create_conversation` en `app/services/conversation_service.py`. El repo `conversation_repository.create_conversation` inserta con `UniqueConstraint(user1_id, user2_id)`. El listado usa `message_repository` para calcular `last_message` y `unread_count`, pero el endpoint de creación devuelve ambos hardcodeados (`None`, `0`). El endpoint lazy (`send_message_lazy`) sí emite `conversation_created` por realtime; el endpoint normal no.

## Problema
Doble clic en "escribir" dispara dos requests concurrentes sobre la misma pareja: ambas ven que no existe la conversación e insertan → `IntegrityError` 500. Además `POST /conversations` devuelve `last_message=None, unread_count=0` aunque existan mensajes previos, y no notifica al destinatario por websocket.

## Alcance
- En `conversation_service.get_or_create_conversation`: validar que `other_user_id` existe (404 si no) y recuperar de la condición de carrera capturando `IntegrityError`.
- `POST /conversations`: devolver `last_message`/`unread_count` reales reutilizando `_build_conversation_response`.
- `POST /conversations`: emitir `conversation_created` al destinatario cuando la conversación es nueva (mismo patrón que `send_message_lazy`).
- Parámetro `limit` de `GET /conversations/{id}/messages` con `ge=1` (rechazar negativos).

## No-goals
- No cambiar el contrato de respuesta de `ConversationResponse`.
- No refactorizar el router inflado (eso es `refactor/architecture-cleanup`).

## Criterios de aceptación
- DADO que `other_user_id` no existe, CUANDO se llama `POST /conversations`, ENTONCES responde 404.
- DADO una pareja ya conversando, CUANDO llegan dos `POST /conversations` concurrentes, ENTONCES ambos responden 200/201 con la misma conversación (sin 500).
- DADO una conversación con mensajes previos, CUANDO `POST /conversations`, ENTONCES `last_message` y `unread_count` reflejan el estado real.
- DADO una conversación recién creada por `POST /conversations`, ENTONCES el destinatario recibe el evento `conversation_created` por websocket.
- DADO `limit=-5` en `GET /conversations/{id}/messages`, ENTONCES responde 422.

## Decisión técnica
- Reutilizar `message_repository.get_last_messages_for_conversations` / `get_unread_counts_for_conversations` (ya existen).
- Dentro del endpoint, el patrón `run_in_threadpool(_persist)` de `send_message_lazy` se aplica también a `POST /conversations` para poder `await` el broadcast.
- Nueva excepción `UserNotFoundError` en `app/core/exceptions/user.py` (heredada de `AppError`, `detail` en español).

## Plan de tests
- `tests/conversations/test_service.py`: añadir test de 404 con usuario inexistente.
- `tests/conversations/test_photo_order.py` no aplica; el 422 de `limit` se cubre con test de ruta en CI.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest --tb=short`

## Resultado
Implementado: validación de `other_user_id` (404), recuperación de la carrera con `IntegrityError`, `last_message`/`unread_count` reales y evento `conversation_created` en `POST /conversations`, y `limit ge=1`. 48 tests backend pasan.
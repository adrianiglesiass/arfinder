---
tag: SPECS/2026-09-fix-realtime-large-message-notify
estado: done
stack: backend
fecha: 2026-09-11
---

# fix-realtime-large-message-notify

## Contexto
- La migración `70c066be0088_realtime_triggers` define el trigger `notify_new_message()`, que llama a
  `realtime.publish(...)` con `content` = `NEW.content` dentro del JSON, y `publish` hace
  `pg_notify('insforge_realtime', <json>::text)`.
- En PostgreSQL el payload de `NOTIFY` debe ocupar **menos de 8000 bytes**; si no, la llamada lanza
  un error, el `AFTER INSERT` aborta la transacción y el `INSERT` del mensaje se deshace.
- `MessageCreate.content` limita a 5000 **caracteres** (`app/schemas/message.py`), no bytes: 2000
  emojis (4 bytes cada uno) o un texto con muchas comillas o saltos de línea (que el JSON escapa a 2
  bytes) superan el límite. El cliente recibe un 500 y el mensaje no se guarda.
- `PostgresNotifyListener._dispatch` (`app/core/realtime.py`) reenvía el `payload` tal cual a los
  sockets suscritos; el frontend pinta el mensaje recibido con `payload.content`.

## Problema
Los mensajes largos con emojis o caracteres escapados no se pueden enviar: fallan con un 500 y se
pierden.

## Alcance
- Nueva migración `b2c3d4e5f6a7_realtime_notify_size_guard` (`down_revision="a1b2c3d4e5f6"`) que
  redefine `realtime.publish`: si el JSON serializado supera 7900 bytes, quita `content` del payload y
  añade `"content_omitted": true`. El `downgrade` restaura la función original.
- `PostgresNotifyListener._dispatch`: para `new_message` con `content_omitted`, recupera el contenido
  del mensaje por `id` en un hilo (`asyncio.to_thread`, con una sesión corta) antes de reenviar, y
  quita la marca. Si el mensaje ya no existe, no emite el evento.
- Los mensajes normales siguen el camino actual, sin tocar la BD.

## No-goals
- NO se cambia el límite de 5000 caracteres de `MessageCreate`.
- NO se cambia el formato del evento que recibe el frontend.

## Criterios de aceptación
- DADO un mensaje cuyo JSON de notificación supera 8000 bytes CUANDO se envía ENTONCES se guarda y el
  endpoint responde con éxito.
- DADO ese mensaje CUANDO el listener recibe la notificación ENTONCES los sockets suscritos reciben el
  evento `new_message` con el `content` completo y sin `content_omitted`.
- DADO un mensaje normal ENTONCES el evento se reenvía sin consultar la BD.

## Decisión técnica
- Recortar solo cuando hace falta, midiendo el JSON final en la propia función: cubre a la vez los
  caracteres multibyte y el escapado, que una validación por bytes en el schema no cubriría bien.
- Alternativa descartada: enviar siempre solo el `id` y leer siempre de BD. Añade una consulta por
  mensaje en el camino caliente para arreglar un caso raro.

## Plan de tests
- `tests/realtime/test_realtime_dispatch.py` (nuevo): `_dispatch` con `content_omitted` rellena el
  contenido y quita la marca; con mensaje inexistente no emite; con un payload normal no consulta.
- La función SQL no existe en la BD de tests (se crea con `create_all`, sin migraciones): se valida
  en un Postgres limpio con la cadena completa de migraciones, insertando un mensaje de más de 8000
  bytes y escuchando el canal.

## Checklist de verificación
- [x] Backend: `ruff check .`
- [x] Backend: `ruff format --check .`
- [x] Backend: `pytest`
- [x] Migración validada en Postgres limpio con un `INSERT` real por encima del límite

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes. Cambio aplicado tras ella: si la
consulta que recupera el contenido falla (BD caída o pool agotado), el error se registra y el evento
se descarta. Antes la excepción subía hasta el bucle del listener, que cerraba la conexión `LISTEN`
y perdía las notificaciones pendientes de todas las conversaciones.

- Migración `b2c3d4e5f6a7_realtime_notify_size_guard` y `_restore_omitted_content` en
  `app/core/realtime.py`.
- **Bug reproducido y arreglo verificado** en un Postgres limpio con la cadena completa de
  migraciones, insertando un mensaje real de 2500 caracteres (8500 bytes: emojis y comillas), la
  mitad del límite de 5000 caracteres del schema:
  - con la migración anterior (`a1b2c3d4e5f6`): el `INSERT` falla con
    `InvalidParameterValue: payload string too long` y el mensaje no se guarda;
  - con `b2c3d4e5f6a7`: el `INSERT` se guarda y la notificación ocupa 157 bytes con
    `content_omitted: true`.
  - `downgrade` a `a1b2c3d4e5f6` y vuelta a `head` funcionan.
- `tests/realtime/test_realtime_dispatch.py`: 5 tests (restaura el contenido, mensaje inexistente,
  fallo de la BD sin romper el listener, payload normal sin consultar la BD, y lectura real de un
  mensaje de 3000 emojis).

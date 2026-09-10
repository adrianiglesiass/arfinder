---
tag: SPECS/2026-09-fix-async-routes-with-sync-db
estado: done
stack: backend
fecha: 2026-09-10
---

# fix-async-routes-with-sync-db

## Contexto
Varias rutas se declaran `async def` y ejecutan SQL síncrono (SQLAlchemy 2.0 con `Session`) directamente sobre el event loop. Convención SDD: async solo para IO externa (Cloudinary, Nominatim, InsForge); la BD síncrona no debe bloquear el event loop.

## Problema
Bloqueos innecesarios del event loop en peticiones con DB local, degradando el throughput del backend bajo concurrencia.

## Alcance
Cambiar a `def` las rutas que solo hacen DB síncrona (quedan gestionadas por el threadpool de Starlette):
- `app/routes/conversations.py::get_conversation_messages`
- `app/routes/profile.py::get_my_profile`, `create_my_profile`, `update_my_profile`, `delete_my_profile`
- `app/routes/messages.py::mark_as_read`
- `app/routes/cities.py::search`

## No-goals
- NO tocar rutas `async` legítimas: `upload_profile_photo` (await Cloudinary), `send_message_lazy` (broadcast websocket), `delete_my_account` (await InsForge), `search_extended` (fallback HTTP), `realtime_endpoint` (WebSocket), `create_or_get_conversation` (pasa a async para emitir realtime en esta misma rama).

## Criterios de aceptación
- DADO un endpoint restante de la lista, CUANDO se declara `def`, ENTONCES no ejecuta SQL en el event loop.
- La API no cambia su contrato (mismas rutas y respuestas).

## Decisión técnica
FastAPI ejecuta `def` routes en un threadpool → la DB síncrona no bloquea el event loop. Se aplica solo a rutas sin `await` de IO externa.

## Plan de tests
- No requiere tests nuevos; los existentes cubren las rutas.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest --tb=short`

## Resultado
Implementado: `get_conversation_messages`, `get_my_profile`, `create_my_profile`, `update_my_profile`, `delete_my_profile`, `mark_as_read` y `cities/search` ahora son `def`.
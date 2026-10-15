---
tag: SPECS/2026-10-feat-block-cuts-messaging
estado: done
stack: ambos
fecha: 2026-10-15
---

# feat-block-cuts-messaging

## Contexto
- F4 (`specs/feat-user-block.md`, PR #295) dejó como no-goal explícito el gating de mensajería: el bloqueo
  solo excluye de la búsqueda y de favoritos. La exclusión usa `block_service.excluded_user_ids`
  (sin límite desde `specs/fix-block-exclusion-limit.md`, PR #302).
- Mensajería (`routes/conversations.py`, `services/conversation_service.py`, `services/message_service.py`):
  - `POST /conversations` → `create_or_get_conversation_with_status` → `get_or_create_conversation`.
  - `POST /conversations/{id}/messages` → `message_service.send_message` (solo comprueba participación).
  - `POST /conversations/with/{user_id}/messages` (envío "perezoso" desde un borrador) →
    `send_message_with_status` → `send_message_to_user` → `get_or_create_conversation`.
  - Ninguno consulta `user_block`: un bloqueado puede seguir escribiendo y abrir conversaciones nuevas.
- Tiempo real (`routes/realtime.py`, `core/realtime.py`): el WebSocket **no envía mensajes**, solo acepta
  `subscribe`/`unsubscribe`. Los eventos nacen en triggers de Postgres (`new_message` al insertar,
  `message_read` al marcar leído) que hacen `pg_notify`; `PostgresNotifyListener._dispatch` los reparte a los
  sockets suscritos a `conversation:<id>`. El listener corre en cada máquina, así que filtrar en `_dispatch`
  funciona aunque los dos usuarios estén en máquinas distintas.
- Detalle de perfil: `GET /profiles/{profile_id}` es público (`Cache-Control: public, max-age=60`) y no mira
  quién lo pide. El frontend envía el token en todas las llamadas a la API (`jwtInterceptor`).
- Frontend: `Messages` (`features/messages/`) con `MessageComposer` (ya acepta `disabled`),
  `ConversationStore` (`@core/conversations`), `BlockService` + `BlockEvents` (`@core/block`) y
  `ProfileDetail` (`features/profile/`), que ante un error conserva el perfil cacheado.

## Problema
Bloquear a alguien no impide que siga escribiéndote: puede mandar mensajes en la conversación existente,
abrir una nueva desde un borrador y ver tu perfil completo. Las confirmaciones de lectura siguen llegando en
tiempo real. El bloqueo, que es la herramienta de seguridad básica de la app, no protege de quien acosa.

## Comportamiento decidido
Sea `A` y `B` dos usuarios y exista un bloqueo en **cualquier** sentido entre ellos:

1. **Enviar mensajes**: ninguno de los dos puede. `POST /conversations/{id}/messages` y
   `POST /conversations/with/{user_id}/messages` responden **403** con código `MESSAGING_BLOCKED` y el
   mismo texto en ambos sentidos ("No puedes enviar mensajes a esta persona."). El texto no dice quién
   bloqueó a quién.
2. **Crear conversación**: `POST /conversations` sin conversación previa responde **403
   `MESSAGING_BLOCKED`**. Si la conversación ya existía, se devuelve (no crea nada nuevo y da acceso al
   historial, que ya era suyo).
3. **Historial**: se mantiene visible y en solo lectura para los dos. Justificación: es de ambos
   participantes, es la prueba que necesita quien reporta y borrarlo sería destructivo e irreversible
   mientras que el bloqueo es reversible. `GET /conversations`, `GET /conversations/{id}` y sus mensajes
   siguen respondiendo, y marcar como leído sigue funcionando (es estado propio).
4. **Señal al cliente**: `ConversationResponse` gana `can_message: bool` (`false` si hay bloqueo en
   cualquier sentido). Es la misma información que ya revela el 403 al intentar escribir, pero permite
   pintar el composer deshabilitado sin hacer al usuario fallar primero.
5. **Tiempo real**: `_dispatch` descarta cualquier evento de una conversación cuyos participantes estén
   bloqueados (en cualquier sentido). Como el envío ya está cortado, en la práctica corta las
   confirmaciones de lectura y cualquier mensaje que se colara en la carrera entre comprobar e insertar.
   La suscripción por WebSocket **no** se rechaza: así, al desbloquear, los eventos vuelven solos sin que el
   cliente tenga que volver a suscribirse. Si la comprobación falla por un error de BD, el evento se
   entrega igualmente (fail-open) y se registra: la garantía principal está en la escritura, y un fallo
   puntual no debe cortar el tiempo real de toda la app.
6. **Detalle de perfil**: `GET /profiles/{id}` responde **404** (el mismo `ProfileNotFoundError` que un id
   inexistente) cuando el dueño del perfil ha bloqueado a quien lo pide. **404 y no 403** porque un 403
   confirmaría que el perfil existe y que hay un bloqueo; el 404 no distingue "bloqueado" de "borrado".
   **Quien bloquea sí sigue viendo el perfil del bloqueado**: es el único sitio desde el que se desbloquea
   (decisión de F4) y no expone nada que no viera ya en `/bloqueados`. Si el bloqueo es mutuo, cada uno ve
   el del otro por la misma razón. Con sesión, la respuesta pasa a `Cache-Control: private, no-store` y
   `Vary: Authorization` para que ninguna caché sirva un perfil a quien ya no debe verlo; sin sesión se
   mantiene `public, max-age=60`.
7. **Desbloquear** restaura todo: `can_message` vuelve a `true`, se puede escribir y crear conversación,
   los eventos vuelven a entregarse y el perfil vuelve a responder 200.

## Alcance
- **Backend**
  - `core/exceptions/conversation.py`: `MessagingBlockedError` (403, `MESSAGING_BLOCKED`, texto en español).
  - `block_repository.exists_between(db, a, b)`: una sola consulta, ambos sentidos.
  - `block_service.is_blocked_between(db, a, b)` y `block_service.get_visible_profile(db, profile_id,
    viewer_id)` (regla del punto 6; vive en `block_service` porque `block_service` ya depende de
    `profile_service` y lo contrario crearía un ciclo).
  - `conversation_service`: `ensure_can_message(db, user_id, other_user_id)`; guardia en
    `get_or_create_conversation` (solo al crear) y en `send_message_to_user`; `can_message` en
    `build_conversation_responses` reutilizando `block_service.excluded_user_ids` (una consulta por lista,
    no una por conversación).
  - `message_service.send_message`: guardia con el otro participante tras comprobar la participación.
  - `schemas/conversation.py`: `can_message: bool = True`.
  - `core/realtime.py`: `_is_conversation_blocked(conversation_id)` (consulta en hilo, como
    `_load_message_content`) y filtro en `_dispatch`. La consulta vive en `block_repository`
    (`is_conversation_blocked`).
  - `routes/profile.py`: `GET /profiles/{id}` recibe el usuario opcional, usa `get_visible_profile` y
    ajusta las cabeceras de caché.
  - Regenerar `api.types.ts` (`can_message`).
- **Frontend**
  - `ConversationStore`: escucha `BlockEvents` y refresca la lista (el `can_message` lo decide el backend,
    que conoce los dos sentidos); `markMessagingBlocked(conversationId)` para reflejar un 403 recibido.
  - `Messages`: `messagingBlocked` (conversación con `can_message === false`, perfil bloqueado por mí o
    403 `MESSAGING_BLOCKED` en el envío). Con bloqueo, en lugar del composer se muestra un aviso en
    español y el historial queda visible:
    - si lo bloqueé yo: "Has bloqueado a {nombre}. Para volver a escribir, desbloquea desde su perfil."
      (con enlace al perfil);
    - en otro caso: "No puedes enviar mensajes en esta conversación."
    Un 403 `MESSAGING_BLOCKED` al enviar no muestra el error genérico de envío ni devuelve el texto al
    composer; marca la conversación como bloqueada.
  - `ProfileDetail`: el botón "Mensaje" no se muestra si he bloqueado el perfil (la barra móvil se mantiene
    porque contiene el menú para desbloquear). Un 404 descarta el perfil cacheado y muestra
    "Este perfil no está disponible" aunque hubiera una copia en caché (`ProfileService.forgetProfileById`).

## No-goals
- NO se oculta la conversación de la lista ni se borra el historial (punto 3).
- NO se notifica en tiempo real al bloqueado de que lo han bloqueado (sería avisarle activamente).
- NO se cierra el acceso anónimo: sin sesión, `GET /profiles/{id}` sigue siendo público, igual que la
  búsqueda anónima de F4. Quien sea bloqueado podría ver el perfil cerrando sesión; cerrarlo exigiría
  hacer privado el detalle para todo el mundo y queda fuera.
- NO se toca el reporte: reportar sigue permitido aunque haya bloqueo.
- NO se bloquea con un `SELECT ... FOR UPDATE` la carrera entre la comprobación y el `INSERT` del
  mensaje: el filtro de tiempo real cubre la entrega de ese mensaje y el volumen no lo justifica.

## Criterios de aceptación
- DADO que A bloqueó a B CUANDO B envía a la conversación existente (`/conversations/{id}/messages`)
  ENTONCES 403 `MESSAGING_BLOCKED` y no se crea el mensaje. Igual CUANDO A envía (sentido inverso).
- DADO el bloqueo CUANDO cualquiera usa `/conversations/with/{user_id}/messages` ENTONCES 403 y no se crea
  conversación ni mensaje.
- DADO el bloqueo y sin conversación previa CUANDO cualquiera hace `POST /conversations` ENTONCES 403; con
  conversación previa ENTONCES 201 con la existente y `can_message: false`.
- DADO el bloqueo CUANDO cualquiera lista sus conversaciones o pide el historial ENTONCES responde 200 y la
  conversación trae `can_message: false`.
- DADO el bloqueo CUANDO llega una notificación de esa conversación ENTONCES no se reparte a los sockets;
  sin bloqueo, sí.
- DADO que A bloqueó a B CUANDO B pide `GET /profiles/{A}` con sesión ENTONCES 404 con el mismo cuerpo que
  un id inexistente; CUANDO A pide `GET /profiles/{B}` ENTONCES 200 con `Cache-Control: private, no-store`.
- DADO que A desbloquea a B ENTONCES todo lo anterior vuelve a funcionar (envío 201, `can_message: true`,
  perfil 200, eventos entregados).
- DADO una conversación con `can_message: false` CUANDO se abre ENTONCES el historial se ve, el composer no
  aparece y se muestra el aviso que corresponda. DADO un envío que recibe 403 `MESSAGING_BLOCKED` ENTONCES
  se quita el mensaje optimista y aparece el aviso, sin el error genérico.
- DADO un perfil que responde 404 CUANDO había copia en caché ENTONCES se muestra "Este perfil no está
  disponible".

## Decisión técnica
- La regla vive en servicios (`block_service`, `conversation_service`, `message_service`), no en rutas: las
  tres rutas de escritura pasan por ellas y el WebSocket no escribe.
- Una consulta `exists_between` con `OR` para la guardia de escritura; para la lista, el conjunto de
  `excluded_user_ids` ya existente.
- El filtro de tiempo real se hace en el listener (una consulta por evento) porque es el único punto que
  ve todos los eventos de todas las máquinas; rechazar la suscripción no bastaría para sockets ya suscritos.

## Plan de tests
- Backend `tests/conversations/test_block_messaging.py`: envío por conversación en ambos sentidos, envío
  perezoso, crear conversación (nueva → 403, existente → 201 con `can_message: false`), historial y lista
  visibles con `can_message`, desbloquear restaura; servicio `is_conversation_blocked`.
- Backend `tests/realtime/test_realtime_dispatch.py`: evento de conversación bloqueada no se reparte; un
  error en la comprobación no rompe el listener.
- Backend `tests/profiles/test_blocks.py`: detalle 404 para el bloqueado (mismo cuerpo que inexistente),
  200 para quien bloquea, mutuo, anónimo 200, cabeceras de caché, desbloquear restaura.
- Frontend `messages.spec.ts`: conversación con `can_message: false` muestra aviso y oculta el composer;
  aviso de "Has bloqueado"; 403 al enviar marca bloqueada sin error genérico.
- Frontend `conversation.store.spec.ts`: un cambio en `BlockEvents` refresca; `markMessagingBlocked`.
- Frontend `profile-detail.spec.ts`: 404 con caché muestra el aviso; "Mensaje" oculto si lo bloqueé.

## Checklist de verificación
- [x] Backend: `make lint`
- [x] Backend: `ruff format --check .` (el Makefile no tiene objetivo `format-check`)
- [x] Backend: `make test`
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `node scripts/set-env.js && npx ng build --configuration production`

## Resultado
Implementado backend y frontend según "Comportamiento decidido".

Revisión (SDD fase 6), dos agentes de solo lectura con las instrucciones de `.opencode/agent/`:
**code-reviewer → APROBADO CON CAMBIOS MENORES** y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**,
sin bloqueantes. Cambios aplicados tras la revisión:
- Un 403 `MESSAGING_BLOCKED` ya no devuelve el texto al composer (lo pedía esta spec y no se cumplía).
- El listener solo consulta el bloqueo si hay sockets locales suscritos a la conversación
  (`manager.has_subscribers`): sin esto cada notify costaba una consulta en todas las máquinas.
- Tests añadidos: crear conversación vuelve a dar 201 tras desbloquear; `Vary: Authorization` también sin
  sesión; sin suscriptores no se consulta la BD.
- UI: el enlace "su perfil" va subrayado y con foco visible (WCAG 1.4.1); la barra móvil dice
  "Has bloqueado a {nombre}" en vez de "¿Te encaja…?"; en desktop, sin botón de mensaje, una línea explica
  "Has bloqueado este perfil. Para escribir, desbloquea desde el menú."; el estado 404 oculta el icono a
  lectores de pantalla y anuncia el error con `role="status"`; el aviso genérico pasa a "No puedes enviar
  mensajes en esta conversación." (sirve también para un borrador, que no tenía conversación previa).

Descartado con motivo: evitar la doble consulta de bloqueo al crear desde un borrador (solo ocurre en el
primer mensaje); limpiar `draftBlocked` cuando el otro desbloquea (ese desbloqueo no se notifica; se
corrige al volver a abrir el chat).

Prueba: los tests nuevos de backend ejecutados contra el código de `develop` → **21 fallan** (el único que
pasa es el de control: un bloqueo ajeno no afecta a la conversación).

## Checklist de verificación (tras la revisión)
- Backend: `ruff check .` sin errores, `ruff format --check .` 118 ficheros, `pytest` **235 passed** (+27).
- Frontend: `format:check` y `lint` en verde, `test:ci` **151 passed** (23 ficheros, +12), build de
  producción OK.

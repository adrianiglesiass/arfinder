---
tag: SPECS/2026-10-fix-abuse-cost-ceiling
estado: approved
stack: backend
fecha: 2026-10-14
---

# fix-abuse-cost-ceiling

## Contexto
- El backend está desplegado en Fly.io (`backend/fly.toml`, app `arfinder-api`, región `fra`,
  `shared-cpu-1x` / `256mb`, `min_machines_running = 0`, `auto_stop_machines = "stop"`).
- Fly **no tiene límite de gasto ni alertas de factura** (doc oficial: *Cost Management*:
  "We don't support billing alerts (yet)" y soporte: "We aren't able to cap spending limits at
  this time"). Solo hay reembolso discrecional para facturas causadas por ataques.
- El único concepto variable ligado al tráfico es **egress** (`$0.02/GB` en Europa); la entrada es
  gratis y Fly **nunca crea Machines automáticamente**, así que el cómputo ya está acotado
  (~$2.19/mes como máximo si la máquina nunca para).
- El saneamiento previo (#300, #302) ya dejó: rate limiter acotado (LRU de 10k claves, IPv6 /64,
  clave `Fly-Client-IP` en Fly), `BodySizeLimitMiddleware`, techo de 6 fotos con candado
  transaccional, `cloudinary.uploader.destroy` en el borrado y límites de acción/seguridad.
- Auditoría sobre `origin/develop` (`2ae0c12`, PR #302): quedan **7 huecos** de abuso/coste
  (hallazgos #53–#59 de `plan.md`).

## Problema
Un atacante todavía puede inflarte la factura de Fly.io y de los terceros: puede provocar
llamadas salientes ilimitadas a InsForge, abrir conexiones WebSocket sin techo, saturar el proxy
sin límite de concurrencia y subir originales a Cloudinary sin transformar. Además **no existe
ningún techo de gasto**: nadie corta el despliegue si el consumo se dispara.

## Alcance
- **#53** Caché negativa de tokens inválidos en `app/core/security.py` (corta el amplificador de InsForge).
- **#54** Límites de WebSocket: conexiones por usuario, conexiones por IP, suscripciones por
  socket y tasa de mensajes por usuario.
- **#55** `[http_service.concurrency]` en `fly.toml` para que el proxy deseche carga.
- **#56** Rate limit en rutas de lectura/autenticación que hoy no lo tienen.
- **#57** Deshabilitar `/docs`, `/redoc` y `/openapi.json` en producción.
- **#58** ~~Transformación de imagen en la subida a Cloudinary~~ → **descartado tras verificar**
  (ver *Decisión técnica*): el ancho de banda ya se optimiza en la URL y la transformación en la
  subida rompería el borrado de fotos.
- **#59** **Watchdog de coste**: cron de GitHub Actions que consulta `fly_edge_data_out` en el
  Prometheus de Fly y **para las Machines** si el egress supera el presupuesto.
- Actualizar `specs/plan.md` con los hallazgos y la fase.

## No-goals
- **Sin Cloudflare ni dominio propio**: decisión del usuario. No se configura ningún CDN/WAF.
- No se toca el frontend salvo lo imprescindible para no romper el WebSocket.
  **Limitación conocida de #54**: `conversation.store.ts` se suscribe a TODAS las
  conversaciones del usuario y `realtime.service.ts` ignora los eventos `error`, así que un
  techo de suscripciones bajo cortaría el tiempo real *en silencio*. Por eso el backend sube
  su techo a 100 y **el frontend NO se toca en esta fase**: el refactor de suscripciones
  (suscrito por pestaña visible + manejo de eventos `error`) queda como fase posterior.
- No se añaden dependencias nuevas de runtime (se reutiliza `SlidingWindowLimiter` existente).
- No se cambia el modelo de datos ni el contrato de la API (ninguna migración).
- No se modifica `.github/workflows/backend-deploy-prod.yml` ni el flujo de despliegue.
- No se automatiza el arranque tras un corte del watchdog: la recuperación es manual y documentada.

## Criterios de aceptación
- DADO un token inválido repetido CUANDO llegan 100 peticiones con él ENTONCES InsForge recibe
  **1** llamada como máximo en el periodo de la caché negativa, y todas responden 401.
- DADO un usuario autenticado CUANDO abre 6 sockets simultáneos ENTONCES el sexto es rechazado.
- DADO un usuario CUANDO abre 101 suscripciones en el mismo socket ENTONCES la 101ª se
  rechaza (techo `MAX_SUBSCRIPTIONS_PER_SOCKET = 100`).
- DADO un usuario CUANDO envía más de 60 mensajes en 10 segundos (sumando todas sus
  conexiones) ENTONCES el servidor cierra el socket con código 1008.
- DADO una carga sostenida CUANDO supera `hard_limit` de concurrencia ENTONCES el proxy responde
  503 sin llegar a la VM (comprobable en `fly logs`).
- DADO `ENVIRONMENT=production` CUANDO se solicita `/docs`, `/redoc` u `/openapi.json` ENTONCES
  la respuesta es 404.
- DADO una ruta de lectura protegida CUANDO un mismo usuario supera su presupuesto ENTONCES
  responde 429 con `Retry-After`; `/health` y `/health/realtime` **nunca** responden 429.
- DADO que el egress de las últimas 24 h supera el presupuesto CUANDO el watchdog se ejecuta
  ENTONCES se crean las Machines a 0 (`fly scale count 0`) y se abre una issue de aviso.
- DADO el watchdog CUANDO el consumo es normal ENTONCES no toca nada y no escribe en el repo.

## Decisión técnica

**#53 — caché negativa** (`app/core/security.py`): reutilizar `_hash_token`, `_cache_lock` y el
patrón de `_token_cache`. Añadir `_negative_cache: dict[str, float]` con TTL de 60 s, límite de
2000 entradas y purga al escribir. En el fallo (`session is None`) se guarda la marca y se
devuelve `None` sin llamar a InsForge. *Descartado*: desactivar la validación — rompería la
expiración real de sesiones.

**#54 — WebSocket** (`app/core/realtime.py`, `app/routes/realtime.py`): constantes de módulo
`MAX_SOCKETS_PER_USER = 5`, `MAX_SOCKETS_PER_IP = 50`, `MAX_SUBSCRIPTIONS_PER_SOCKET = 100`,
`MAX_MESSAGE_BYTES = 8192` y `WS_MESSAGES_PER_WINDOW = 60` / 10 s. El contador por usuario se
deriva de `self._by_user`; el por IP necesita un mapa nuevo `_by_ip` de cuentas, decrementado al
desconectar (el `finally` actual es el punto único de salida). La tasa de mensajes reutiliza
`SlidingWindowLimiter` de `app/core/rate_limit.py` con clave `ws:{user_id}` — **no se duplica la
implementación**; el presupuesto es **por usuario** (compartido entre sus conexiones), no por
conexión. La clave de cliente se comparte con HTTP extrayendo un helper
`resolve_client_key(headers, client)` en `app/core/rate_limit.py`, de modo que el WebSocket lea
`Fly-Client-IP` igual que las rutas HTTP. El rechazo en el *handshake* se hace con una
respuesta **429 pre-upgrade** vía la extensión `websocket.http.response` (con `Retry-After`);
si el cliente no la negocia, el cierre pre-accept se traduce en un rechazo HTTP del handshake
(403 en uvicorn) — nunca entrega un 1008 al cliente, que solo existe tras el upgrade.
*Descartado*: heartbeat de aplicación. uvicorn ya envía ping de protocolo cada 20 s
(`ws_ping_interval=20.0`), lo que mantiene vivo el socket ante el timeout de 100 s de un proxy
externo; añadiría código sin beneficio.

Techos revisados tras la revisión de `code-reviewer`:
- `MAX_SOCKETS_PER_IP = 50` (antes 10): **el límite real es por usuario (5)**; el por IP es
  solo un amortiguador secundario y 10 resultaba demasiado bajo tras **CGNAT** — operadores
  móviles, redes de campus y oficinas comparten una sola IP pública, así que un techo bajo
  castigaba a usuarios legítimos sin añadir protección real.
- `MAX_SUBSCRIPTIONS_PER_SOCKET = 100` (antes 20): el frontend se suscribe a **todas** las
  conversaciones del usuario (ver *No-goals*), y con `realtime.service.ts` ignorando los
  eventos `error` un techo de 20 habría cortado el tiempo real en silencio con 21+
  conversaciones. El coste de abuso es nulo: cada `subscribe` es una query de participación y
  el usuario ya está limitado a 5 sockets. **Interacción conocida**: el frontend lanza los
  `subscribe` en ráfaga y la tasa por usuario (60 msgs/10 s) cierra el socket con 1008 pasado
  el 60º mensaje, así que en la práctica el techo efectivo de suscripciones simultáneas es 60;
  subir `WS_MESSAGES_PER_WINDOW` rompería el criterio de aceptación y queda fuera de esta fase.
- **Techo de memoria real**: `--ws-max-size 65536` (64 KiB) en el CMD del `Dockerfile` —
  uvicorn rechaza el frame *antes* de materializarlo (su default es 16 MiB). El check de
  `MAX_MESSAGE_BYTES` corre después de `receive_text()` y actúa como **segunda capa**.
*Descartado*: heartbeat de aplicación. uvicorn ya envía ping de protocolo cada 20 s
(`ws_ping_interval=20.0`), lo que mantiene vivo el socket ante el timeout de 100 s de un proxy
externo; añadiría código sin beneficio.

**#55 — concurrencia** (`backend/fly.toml`): `[http_service.concurrency]` con
`type = "requests"`, `soft_limit = 30`, `hard_limit = 60`. *Descartado* `type = "connections"`:
contaría los sockets WebSocket ociosos y agotaría el presupuesto con usuarios legítimos.
Verificar el bloque contra la doc de Fly antes de dar la fase por hecha.

**#56 — límites de lectura** (`app/core/rate_limit.py` + routers): nuevo `read_limiter`
(`SlidingWindowLimiter(240)`) por **usuario** para rutas autenticadas de lectura
(`GET /profiles/me`, `GET /conversations*`, `PATCH .../read`, `PATCH /messages/{id}/read`,
`GET /auth/me`); `GET /profiles/{id}` (pública y con join de fotos) usa el `limiter` por IP de
60/min existente. `/auth/sync-cleanup` (sin auth) también pasa por `limiter`.
*Descartado*: usar un único bucket compartido por IP para todo — un usuario legítimo que navega
varios perfiles se bloquearía a sí mismo.

**#58 — Cloudinary: DESCARTADO** (hallazgo cerrado sin código). Verificado:
- El ancho de banda **ya está optimizado en la URL**: `frontend/src/app/app.config.ts:38-47`
  inyecta `/upload/f_auto,q_auto,c_limit[,w_XXX]/` en el `IMAGE_LOADER`, así que las fotos se
  sirven comprimidas y con tamaño según el `srcset`.
- El storage ya está acotado por el techo de 6 fotos por perfil (#37, PR #302) y por el plan
  gratuito de Cloudinary.
- Aplicar transformación en la subida haría que la `secure_url` guardada llevara el segmento
  `f_auto,q_auto,c_limit/`, y `extract_public_id_from_url` (`app/clients/storage_client.py:38-50`)
  solo descarta el segmento de versión (`v\d+`): el `public_id` saldría mal y **`cloudinary.destroy`
  dejaría de borrar**, que es exactamente el agujero que cerró #12. Corregirlo exigiría persistir
  el `public_id` en una columna nueva → migración, que está fuera de alcance.

**#57 — docs** (`app/main.py`): al construir la app,
`docs_url=None, redoc_url=None, openapi_url=None` cuando `settings.ENVIRONMENT == "production"`.
En el resto de entornos se mantienen. Verificar antes que ni el frontend ni los tests consumen
`/openapi.json` en tiempo de ejecución (el frontend usa `api.types.ts` generados, no fetch en vivo).

**#58 — Cloudinary** (`app/clients/storage_client.py`): transformación en la subida
(`crop: "limit"` a 1600 px + `quality: auto` + `fetch_format: auto`). **Verificar primero** si la
URL ya lleva transformación embebida (el commit histórico `#250` hablaba de `c_limit`); si la
transformación ya se aplica al servir, el cambio se limita a no duplicarla y se documenta.

**#59 — watchdog** (`.github/workflows/cost-guard.yml`, **nuevo**): cron `*/15 * * * *` +
`workflow_dispatch`. Consulta
`https://api.fly.io/prometheus/<ORG>/api/v1/query` con `Authorization: FlyV1 ${{ secrets.FLY_READONLY_TOKEN }}`:
`sum(increase(fly_edge_data_out{app="arfinder-api"}[24h]))` y `fly_edge_http_responses_count`.
- **Presupuesto**: `$4/mes` (por debajo del umbral de $5 bajo el que Fly exime la factura, lo que
  mantiene el coste real en $0) → traducido a `MAX_DAILY_EGRESS_GB ≈ 6.5 GB/día`.
- **Acción**: si se supera, `fly scale count 0` con `secrets.FLY_API_TOKEN` y se abre una issue
  (`permissions: issues: write`). Con 0 Machines el gasto cae a céntimos de rootfs.
- **Sin estado en disco**: se calcula `increase()` sobre las últimas 24 h, así que el workflow no
  commitea nada. *Descartado* un fichero de estado acumulado en el repo: generaría ~96 commits al
  día y la retención de Prometheus (15 días) ya cubre la ventana que necesitamos.
- **Recuperación manual**: `fly scale count 1`, documentada en el runbook.
- Secretos que debe crear el usuario: `FLY_READONLY_TOKEN` (`fly tokens create readonly`) y
  `FLY_API_TOKEN`. La exención por debajo de $5 solo aplica a la organización personal y no está
  documentada en la página de precios: no se confía en ella, se diseña para no necesitarla.
- Limitación conocida: los workflows con `schedule` solo corren en la rama por defecto y se
  suspenden tras 60 días sin actividad en el repositorio.

## Plan de tests
- `backend/tests/security/test_negative_token_cache.py`: un token inválido produce **una sola**
  llamada a InsForge simulada en el periodo del TTL; distintos tokens no comparten marca.
- `backend/tests/realtime/test_ws_limits.py`: límite de sockets por usuario, por IP, de
  suscripciones y cierre 1008 por tasa de mensajes (mockeando el transporte).
- `backend/tests/core/test_read_rate_limits.py`: 429 en la ruta de lectura al superar el
  presupuesto y **200 en `/health`** bajo la misma carga.
- `backend/tests/test_docs_disabled.py`: en `ENVIRONMENT=production` `/docs`, `/redoc` y
  `/openapi.json` devuelven 404; en `testing` siguen accesibles.
- `cost-guard`: se verifica con `actionlint` y una ejecución manual (`workflow_dispatch`) en modo
  dry-run antes de dejarlo armado.

## Checklist de verificación
- [x] Backend: `ruff check .` y `ruff format --check .`
- [x] Backend: `pytest --tb=short`
- [x] Frontend: N/A en este PR — no se modifica ningún fichero de `frontend/`
- [x] Frontend: N/A en este PR — sin cambios que testear
- [x] Build: no aplica (el protocolo del WS es compatible: un 429 en el handshake y los
  eventos `error` son ignorados por el cliente actual, y el techo de 100 suscripciones
  hace el rechazo prácticamente inalcanzable)

## Resultado
<pendiente: al cerrar, qué pasó, diffs de comportamiento y enlaces a commits>

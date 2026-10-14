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
  ENTONCES se escalan las Machines a 0 (`fly scale count 0`) y se abre una issue de aviso (una
  sola mientras siga abierta).
- DADO que la consulta a Prometheus falla CUANDO el watchdog se ejecuta ENTONCES el job falla y
  **no** se escala nada.
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
`type = "requests"`, `soft_limit = 50`, `hard_limit = 100`. Verificado contra la doc de Fly
(*fly.toml reference*): sin bloque, el tipo es `connections`, `soft_limit` vale 20 y **no hay
`hard_limit`** ("If unset, no `hard_limit` is enforced"), así que el proxy nunca deja de enviar
tráfico a la Machine. Al alcanzar `hard_limit` el proxy deja de mandarle peticiones nuevas
(esperan en el borde y acaban en error del proxy), sin consumir CPU ni memoria de la VM.
Dimensionado (no hay `--workers` en el `CMD`: **un solo proceso uvicorn** en `shared-cpu-1x` /
`256mb`):
- Las rutas son síncronas → corren en el *threadpool* de AnyIO (**40 hilos** por defecto) y el
  pool de SQLAlchemy permite **40 conexiones** (`pool_size=20` + `max_overflow=20`,
  `app/db/database.py`). Más de ~40 peticiones de trabajo real simultáneas solo hacen cola
  dentro del proceso consumiendo memoria.
- `soft_limit = 50` ≈ capacidad del *threadpool* + margen para peticiones ligeras (`/health`,
  respuestas cacheadas). Con una sola Machine solo sirve de señal (no hay otra a la que
  desviar), pero deja el valor correcto si un día se escala a 2.
- `hard_limit = 100`: la doc no aclara si un WebSocket abierto cuenta como petición durante toda
  su vida; **asumimos que sí** (caso peor). 100 deja hueco a ~50 sockets en tiempo real más un
  *threadpool* completo, y acota la memoria de peticiones en vuelo (cuerpo ≤ límite de
  `BodySizeLimitMiddleware`) muy por debajo de 256 MB. El techo real por usuario lo siguen
  poniendo los límites de #54 (5 sockets/usuario, 50/IP).
*Descartado* `type = "connections"`: el proxy no podría reutilizar conexiones y cada socket
TCP del cliente (keep-alive incluido) gastaría una plaza aunque estuviera ocioso.
*Descartado* `30/60` (borrador inicial): con WebSockets contando como petición, 60 plazas
equivalen a ~60 usuarios conectados a la vez; demasiado justo para un techo de coste cuyo
objetivo es proteger la VM, no limitar usuarios legítimos.

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

**#59 — watchdog** (`.github/workflows/cost-guard.yml` + `backend/scripts/cost_guard.py`,
**nuevos**): cron `*/15 * * * *` + `workflow_dispatch` (input `dry_run`, por defecto `true`).
- **Medición** (`backend/scripts/cost_guard.py`, solo librería estándar): consulta
  `https://api.fly.io/prometheus/<org>/api/v1/query` con
  `sum(increase(fly_edge_data_out{app="arfinder-api"}[24h]))` (`fly_edge_data_out` es un
  *counter* en bytes; doc *Metrics on Fly.io*). Cabecera `Authorization: FlyV1 <token>` para
  tokens de `fly tokens create` (si el secreto ya trae el prefijo `FlyV1 `/`Bearer `, se respeta).
  Valida `app` y la ventana con una expresión regular antes de construir la query. Escribe
  `over_budget` y `egress_gb` en `$GITHUB_OUTPUT` y un resumen en `$GITHUB_STEP_SUMMARY`.
  **El script nunca muta nada**: solo mide y decide. Responsabilidad única: el workflow actúa.
- **Fallo seguro**: si la consulta falla (red, 401, JSON inválido, `status != success`) el script
  sale con código 2, el job queda en rojo y **no se escala nada**. Un vector vacío (ninguna serie
  en la ventana) cuenta como 0 bytes con un `::warning::` para detectar un `app`/org mal
  configurado.
- **Presupuesto**: `$4/mes` → `200 GB/mes` a `$0.02/GB` (Europa) → `MAX_DAILY_EGRESS_GB = 6.5`
  (GB decimales, 10⁹ bytes, como factura Fly). Configurable con la variable de repositorio
  `COST_GUARD_MAX_DAILY_EGRESS_GB` sin tocar código.
- **Acción**: si `over_budget == 'true'` y no es `dry_run`: `flyctl scale count 0 --app
  arfinder-api --yes` con `secrets.FLY_COST_GUARD_TOKEN` y se abre una issue de aviso
  (`permissions: issues: write`) con los pasos de recuperación; si ya hay una issue abierta con
  el prefijo `[cost-guard]` no se duplica. Con 0 Machines el gasto cae a céntimos de rootfs.
- **Sin configurar no molesta**: mientras no exista `FLY_READONLY_TOKEN`, el job pasa con un
  `::warning::` ("no armado") en vez de fallar y enviar un correo cada 15 minutos.
- **La alerta llega aunque falle el corte**: la issue se abre con `!cancelled()`; si
  `flyctl scale` falla (p. ej. falta `FLY_COST_GUARD_TOKEN`) el título dice
  `FAILED to scale down` e indica el comando manual.
- **No puede destruir datos**: `fly.toml` no declara `[mounts]` (sin volúmenes) y la base de
  datos es externa, así que las Machines son desechables: `scale count 0` solo elimina cómputo
  sin estado y `fly scale count 1` las recrea desde la release actual. El token es un *deploy
  token* acotado a la app (no puede tocar otras apps de la org) y el workflow no ejecuta ningún
  comando sobre volúmenes, secretos, bases de datos ni releases. *Descartado* `fly machine stop`:
  con `auto_start_machines = true` el proxy la volvería a arrancar con la siguiente petición.
- **Sin estado en disco**: se calcula `increase()` sobre las últimas 24 h, así que el workflow no
  commitea nada (`permissions: contents: read`). *Descartado* un fichero de estado acumulado en
  el repo: generaría ~96 commits al día y la retención de Prometheus (15 días) ya cubre la
  ventana que necesitamos.
- **Recuperación manual** (en la issue y en la PR): como la ventana es de 24 h, el watchdog
  volvería a cortar si se restaura antes; por eso primero `gh workflow disable cost-guard.yml`,
  luego `fly scale count 1 --app arfinder-api`, y `gh workflow enable cost-guard.yml` pasadas
  24 h (o subir antes `COST_GUARD_MAX_DAILY_EGRESS_GB`).
- **Secretos/variables que debe crear el usuario**: `FLY_READONLY_TOKEN`
  (`fly tokens create readonly <org>`), `FLY_COST_GUARD_TOKEN`
  (`fly tokens create deploy -a arfinder-api`) y, si la org no es `personal`, la variable
  `FLY_ORG`. Se usa un token propio y no `FLY_API_TOKEN_PROD`: ese vive en el *environment*
  `production`, cuyas reglas de protección podrían bloquear un cron, y así se puede revocar uno
  sin romper el otro. La exención por debajo de $5 solo aplica a la organización personal y no
  está documentada en la página de precios: no se confía en ella, se diseña para no necesitarla.
- Limitación conocida: un `fly deploy` (push a `main`) sobre una app con 0 Machines vuelve a
  crear una, así que **no se debe desplegar durante un incidente** de coste.
- Limitación conocida: los workflows con `schedule` solo corren desde la rama por defecto
  (`develop`) y GitHub los suspende tras 60 días sin actividad en el repositorio. El egress de
  Fly es la única métrica vigilada: Cloudinary e InsForge tienen sus propios planes gratuitos con
  tope duro.

## Plan de tests
- `backend/tests/security/test_negative_token_cache.py`: un token inválido produce **una sola**
  llamada a InsForge simulada en el periodo del TTL; distintos tokens no comparten marca.
- `backend/tests/realtime/test_ws_limits.py`: límite de sockets por usuario, por IP, de
  suscripciones y cierre 1008 por tasa de mensajes (mockeando el transporte).
- `backend/tests/core/test_read_rate_limits.py`: 429 en la ruta de lectura al superar el
  presupuesto y **200 en `/health`** bajo la misma carga.
- `backend/tests/test_docs_disabled.py`: en `ENVIRONMENT=production` `/docs`, `/redoc` y
  `/openapi.json` devuelven 404; en `testing` siguen accesibles.
- `backend/tests/ops/test_cost_guard.py`: cabecera de autorización, construcción y
  validación de la query, parseo de la respuesta de Prometheus (vector vacío, varias series,
  `status` de error, JSON inválido), decisión de presupuesto, salidas en `$GITHUB_OUTPUT` y
  código 2 sin token o ante un error de red (nunca `over_budget=true` en un fallo).
- `cost-guard.yml`: YAML válido (+ `actionlint` si está disponible) y una ejecución manual
  (`workflow_dispatch`, `dry_run: true`) una vez creados los secretos, antes de dejarlo armado.

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

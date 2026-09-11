---
tag: SPECS/2026-09-fix-rate-limit-per-client
estado: approved
stack: backend
fecha: 2026-09-11
---

# fix-rate-limit-per-client

## Contexto
- `app/core/rate_limit.py` crea `Limiter(Rate(60, MINUTE))` y `Limiter(Rate(120, MINUTE))`. En
  `pyrate-limiter` 4.1, pasar un `Rate` usa `SingleBucketFactory`, que devuelve **el mismo
  `InMemoryBucket` para cualquier clave**: el `client_ip` o el `user:{id}` que se pasa a
  `try_acquire` se ignora. Verificado con la librería instalada: con `Rate(3, MINUTE)`, tres
  peticiones de la clave `"a"` hacen que la primera de `"b"` se rechace.
- Consecuencia en producción: 60 peticiones por minuto **para todo el sitio** entre `GET /profiles`,
  todo `/cities/*` y `POST /profiles/me/photos`; y 120 mensajes por minuto para todos los usuarios
  juntos (`routes/conversations.py`, envío de mensajes). En tests no salta porque el limitador se
  desactiva con `ENVIRONMENT == "testing"`.
- La clave de IP sale de `request.client.host`. El `Dockerfile` arranca uvicorn con
  `--proxy-headers --forwarded-allow-ips=*`, así que ese valor es el primero de `X-Forwarded-For`,
  que controla el cliente: con un valor aleatorio por petición se esquivaría un límite por IP.
- En Fly, el proxy de borde añade `Fly-Client-IP` con la IP real del cliente.
- Usar una `BucketFactory` por clave de la propia librería registra cada bucket en un hilo "leaker"
  y no los libera: la memoria crece con cada IP distinta en una VM de 256 MB.

## Problema
Unos pocos usuarios activos, o un único script, agotan el límite de todos y el resto de usuarios
recibe 429 en búsqueda, autocompletado, subida de fotos y envío de mensajes.

## Alcance
- `app/core/rate_limit.py`: `SlidingWindowLimiter` propio (ventana deslizante por clave, `deque` de
  marcas de tiempo, `threading.Lock`, reloj inyectable) que purga las claves inactivas cuando se
  supera un máximo de claves, para acotar la memoria.
- Clave de cliente: `client_key(request)` usa `Fly-Client-IP` si existe y, si no,
  `request.client.host`. Las dependencias públicas `rate_limiter` y `message_rate_limiter` mantienen
  su firma, así que las rutas no cambian.
- Se elimina `pyrate-limiter` de `requirements.txt` (solo lo usaba este módulo).

## No-goals
- NO se comparte el estado entre máquinas (Redis): hoy corre una sola máquina en Fly.
- NO se cambian los límites (60 y 120 por minuto) ni se añaden a más rutas: eso es el #38 de
  `fix/backend-integrity`.

## Criterios de aceptación
- DADO un límite de N por minuto CUANDO una clave hace N peticiones ENTONCES la N+1 de esa clave se
  rechaza y la primera de otra clave se acepta.
- DADO una clave que llegó al límite CUANDO pasa la ventana ENTONCES vuelve a aceptarse.
- DADO más claves que el máximo configurado CUANDO llega una nueva ENTONCES se purgan las inactivas.
- DADO una petición con `Fly-Client-IP` ENTONCES la clave es esa IP aunque `X-Forwarded-For` diga otra.

## Decisión técnica
- Implementación propia de unas decenas de líneas en vez de la `BucketFactory` de la librería: con
  una sola máquina y una sola instancia de uvicorn, un diccionario en memoria es suficiente, se puede
  testear con un reloj falso y controlamos la memoria. Quitar la dependencia elimina un comportamiento
  sorprendente (ignorar la clave) que es justo el origen de este bug.
- `Fly-Client-IP` en lugar de cambiar `--forwarded-allow-ips`: no depende de conocer las IPs del proxy
  de Fly y no altera cómo se resuelven el esquema y el host del resto de la app.

## Plan de tests
- `tests/core/test_rate_limit.py` (nuevo): aislamiento por clave, rechazo al llegar al límite,
  expiración de la ventana con reloj falso, purga de claves, y `client_key` con y sin `Fly-Client-IP`.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest`

## Resultado

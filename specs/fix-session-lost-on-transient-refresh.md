---
tag: SPECS/2026-09-fix-session-lost-on-transient-refresh
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-session-lost-on-transient-refresh

## Contexto
- `AuthService.forceRefreshToken()` (`core/auth/auth.service.ts`) llama a
  `insforge.auth.refreshSession()` y, **ante cualquier `error`**, borra el refresh token de
  `localStorage` y el access token en memoria.
- El SDK de InsForge (`refreshSession` en `@insforge/sdk/dist/index.mjs`) convierte también los
  fallos de red en `error`: el `catch` pasa por `wrapError`, que crea un `InsForgeError` con
  `statusCode` 500. Los 5xx y 429 del servidor llegan con su `statusCode`. Un refresh token inválido o
  caducado llega como 400/401.
- `bootstrapSession()` llama a `forceRefreshToken()` al arrancar la app. `authErrorInterceptor`
  (`core/interceptors/jwt-interceptor.ts`) lo llama tras un 401 de nuestra API y, si devuelve `null`,
  ejecuta `invalidateSession()`, que hace `logout()` y también borra los tokens.

## Problema
Abrir la PWA sin cobertura, o con InsForge caído o limitando peticiones, cierra la sesión del usuario
para siempre aunque su refresh token siga siendo válido.

## Alcance
- `AuthService.refreshSessionToken()`: devuelve `{ token }` o `{ token: null, transient }`. Solo
  borra los tokens cuando el rechazo es definitivo (`statusCode` 400, 401 o 403); con 0, 408, 429,
  5xx o un fallo de red los conserva y marca `transient: true`. `forceRefreshToken()` sigue
  existiendo y delega en él.
- `bootstrapSession()`: con un fallo transitorio deja al usuario sin sesión en memoria, conserva los
  tokens y reintenta el arranque una vez cuando el navegador vuelve a estar `online`.
- `authErrorInterceptor`: con un fallo transitorio propaga el error original y **no** invalida la
  sesión.

## No-goals
- NO se añade una cola de reintentos ni un modo offline para las peticiones a la API.
- NO se cambia el almacenamiento de tokens.

## Criterios de aceptación
- DADO un refresh que falla por red o con 5xx CUANDO arranca la app ENTONCES el refresh token sigue en
  `localStorage` y, al volver la conexión, la sesión se restaura sin volver a iniciar sesión.
- DADO un refresh rechazado con 401 ENTONCES se borran los tokens como hasta ahora.
- DADO un 401 de la API y un refresh transitorio fallido ENTONCES el interceptor devuelve el error sin
  hacer logout.

## Decisión técnica
- Clasificar por `statusCode` del `InsForgeError` y no por mensaje: es el dato estable que expone el
  SDK. Se trata como definitivo solo lo que indica un token rechazado; ante la duda se conserva el
  token, porque perder la sesión es peor que un reintento fallido.

## Plan de tests
- `core/auth/auth.service.spec.ts` (nuevo): 401 borra los tokens; red/500/429 los conservan y
  devuelven `transient`; un éxito guarda los tokens nuevos.
- `core/interceptors/jwt-interceptor.spec.ts` (nuevo): tras un 401, un refresh transitorio no llama a
  `invalidateSession`; uno definitivo sí.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes. Cambios aplicados tras ella:
- **Lista explícita de estados transitorios** (sin `statusCode`, 0, 408, 429 y 5xx). El resto se trata
  como definitivo: antes un 404 se habría tomado por transitorio y un token revocado no se borraría.
- **Reintento con backoff** (5 s, 30 s y 120 s) además del evento `online`. Con un 5xx o 429 de
  InsForge y el navegador en línea, `online` no llega nunca.
- Al restaurarse la sesión en un reintento, si el usuario estaba en `/login` (adonde le mandó el
  guard), se le lleva a `/explorar`.
- El reintento se cancela en `syncUser()`, por donde pasan todos los logins (email, OAuth y
  verificación), y no se relanza si ya hay usuario. Antes, un `online` posterior a un login manual
  podía relanzar el arranque y vaciar la sesión en memoria.

- `core/auth/auth.service.ts` (`refreshSessionToken`, `scheduleBootstrapRetry`) y
  `core/interceptors/jwt-interceptor.ts`.
- `core/auth/auth.service.spec.ts`: 8 tests (401 y 404 borran; 500, 429 y excepción del SDK
  conservan; éxito guarda; reintento al volver la conexión y salida del login; sin relanzar tras un
  login manual). `core/interceptors/jwt-interceptor.spec.ts`: 3 tests.
- Frontend: **43 tests en verde** (10 archivos), formato, lint y build OK.

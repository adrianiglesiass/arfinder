---
tag: SPECS/2026-09-fix-session-lost-on-transient-refresh
estado: approved
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
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Frontend: `npm run build`

## Resultado

---
tag: SPECS/2026-10-feat-data-rights
estado: done
stack: ambos
fecha: 2026-10-28
---

# feat-data-rights

## Contexto
- `feat-legal-consent` añadió registro de consentimiento, pero la app todavía no facilita
  los derechos del interesado: no hay forma de descargar los datos personales que Arfinder
  guarda sobre el usuarix (art. 20 RGPD, portabilidad).
- El backend no envía cabeceras de seguridad HTTP (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, HSTS) ni el frontend en Vercel.
- Los logs de realtime podían volcar payloads de mensajes (contenido de usuario) en los dos
  extremos del canal: `routes/realtime.py` (excepciones del WebSocket) y
  `core/realtime.py` (payloads NOTIFY malformados).

## Problema
Sin exportación de datos no se puede atender una solicitud de portabilidad, sin cabeceras de
security las respuestas son más vulnerables a sniffing/clickjacking, y los logs de realtime
registran contenido privado de conversaciones (fallo de privacidad en los propios logs).

## Alcance
- **Portabilidad de datos**
  - `GET /auth/me/export` → JSON `UserDataExport` (`app/schemas/data_export.py`):
    `generated_at`, `user` (incluye campos de consentimiento), `profile` con `photos` y
    `conversations` con mensajes; la contraparte solo expone `id` y `name` (nunca email ni
    otros datos de contacto).
  - `app/services/data_export_service.py::export_user_data` reutilizando
    `user_repository`, `profile_repository`, `conversation_repository` y el nuevo
    `message_repository.get_all_messages_for_conversations` (carga eficiente por lotes).
  - Protección: autenticación obligatoria + rate limit `read_rate_limiter`; respuesta con
    `Content-Disposition: attachment; filename="arfinder-datos.json"` y `Cache-Control: no-store`.
- **Security headers**
  - `app/core/security_headers.py::SecurityHeadersMiddleware` (ASGI): `X-Content-Type-Options:
    nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y
    HSTS (`max-age=31536000; includeSubDomains`) solo fuera de `development`; usa
    `setdefault` (nunca pisa cabeceras ya fijas por una ruta).
  - Registrado **el último** en `create_app()` → capa más externa (cubre también el preflight
    CORS); mismos headers en `frontend/public/vercel.json` para el estático.
  - Tests `backend/tests/test_security_headers.py`.
- **Fix de logging (privacidad)**
  - `routes/realtime.py`: la excepción de cierre del WS se loguea solo con `type(e).__name__`
    y `user_id` (nunca `str(e)`, que puede llevar contenido del frame).
  - `core/realtime.py`: el payload NOTIFY inválido se loguea por canal y longitud, no el
    payload en crudo.
- **Frontend**
  - Sección "Tus datos" en `/perfil/editar` (`features/profile/edit/data-download/`):
    botón `app-data-download` con estado `loading`, descarga del Blob vía object URL
    (revocada tras 1 s), toast de éxito y toast de error con `ErrorService`.
  - `AuthApiService.exportMyData(): Promise<Blob>` + `AuthService.exportMyData`.
  - `api.types.ts` regenerado.
- **Feedback de review incluido** (commit `6cc1196`): focus trap del diálogo de
  reconsentimiento con la directiva `ModalDialog` (`appModalDialog`) + ids accesibles
  (`uniqueId` para `aria-labelledby`/`aria-describedby`), `TermsConsent.focusInput()` con
  foco automático al bloquear el último paso del onboarding, ajustes de a11y del checkbox,
  y actualización de la política de privacidad (`docs/legal/privacy_policy.md` +
  `features/legal/privacy/privacy.html`) para declarar la descarga de datos y las cabeceras.

## No-goals
- NO exportación asíncrona por email para volúmenes grandes (el export es síncrono y
  rate-limitado; suficiente para el tamaño actual de los datos).
- NO derecho de rectolución/borrado desde la app (el borrado ya existe vía
  `feat/fix-account-deletion`; la rectificación vía edición de perfil).
- NO tabla de auditoría de exportaciones ni límite diario por usuario (solo
  `read_rate_limiter`).
- NO incluir en el export datos de terceros más allá de `id`/`name` de la contraparte.

## Criterios de aceptación
- DADO un usuarix autenticado CUANDO llama a `GET /auth/me/export` ENTONCES recibe 200 con
  JSON `UserDataExport` que incluye su `user` (con `terms_accepted_at`/`terms_version`),
  su perfil con fotos y sus conversaciones con mensajes, y las cabeceras
  `Content-Disposition: attachment` (`arfinder-datos.json`) y `Cache-Control: no-store`.
- DADO una conversación con un no-contacto CUANDO se exporta ENTONCES la contraparte solo
  aparece como `{ id, name }` (sin email ni datos de contacto).
- DADO `GET /auth/me/export` SIN token CUANDO se invoca ENTONCES responde 401.
- DADO una ráfaga de peticiones al endpoint CUANDO supera el límite del rate limiter
  ENTONCES responde 429.
- DADO cualquier respuesta del backend CUANDO se genera ENTONCES incluye
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y
  `Referrer-Policy: strict-origin-when-cross-origin`, sin pisar cabeceras propias de una
  ruta.
- DADO `ENVIRONMENT=development` CUANDO se genera una respuesta ENTONCES NO incluye
  `Strict-Transport-Security`; en cualquier otro entorno sí (HSTS).
- DADO una excepción en el WebSocket de realtime CUANDO se cierra ENTONCES el log contiene
  solo tipo de excepción y `user_id`, nunca el contenido del mensaje.
- DADO el usuarix en `/perfil/editar` CUANDO pulsa "Descargar mis datos" ENTONCES se descarga
  `arfinder-datos.json` y aparece el toast de éxito; si la llamada falla, aparece el toast de
  error sin descargar nada.
- DADO el diálogo de reconsentimiento abierto CUANDO el foco entra ENTONCES queda atrapado en
  el diálogo (`appModalDialog`) con título/descripción referenciados por `aria-labelledby`/
  `aria-describedby`.

## Decisión técnica
- **Export síncrono en el request** con `read_rate_limiter` en la ruta: sin colas ni storage
  temporal que gestionar; el rate limit cubre el coste del full-scan de mensajes.
- **Carga de mensajes por lotes** (`get_all_messages_for_conversations` con `IN` de ids)
  en vez de N queries por conversación (evita N+1).
- **Middleware ASGI puro** (sin dependencia de BaseHTTPMiddleware) y registrado el último en
  `create_app()` para que sea la capa más externa; `MutableHeaders.setdefault` garantiza que
  no pisa headers ya decididos por la app (p.ej. los de seguridad de una ruta concreta).
- **HSTS condicional por `settings.ENVIRONMENT`** para no romper el desarrollo en plain HTTP.
- **Descarga en frontend vía Blob + object URL** con `setTimeout` de revocación (1 s) para
  no fumar memoria; errores traducidos con `ErrorService.processError` y feedback por toast.
- **Log por tipo, no por valor**: `type(e).__name__` en el WS y canal/longitud en el listener
  NOTIFY — el contenido de usuario jamás llega al log.

## Plan de tests
- Backend `tests/auth/test_data_export.py`: estructura del export (user/profile/conversaciones),
  privacidad de la contraparte, sin token → 401.
- Backend `tests/test_security_headers.py`: presencia de los headers base, ausencia de HSTS en
  development, no-pisado de headers existentes.
- Frontend `data-download.spec.ts` (descarga, éxito con toast, error con toast) y
  `infrastructure/api/auth/auth.api.service.spec.ts` (llamada a `GET /auth/me/export` con
  `responseType: blob`).
- `terms-reconsent-dialog.spec.ts` / `terms-consent.spec.ts` actualizados por los cambios de
  review (focus trap, ids únicos, `focusInput`).

## Checklist de verificación
- [x] Backend: `make lint`
- [x] Backend: `make format-check`
- [x] Backend: `make test`
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] `npm run generate:types` ejecutado (`api.types.ts` con `GET /auth/me/export`)

## Resultado
- `GET /auth/me/export` (JSON portátil `UserDataExport`, rate-limitado, attachment
  `arfinder-datos.json`, contraparte sin datos de contacto) servido por
  `data_export_service.export_user_data` + `schemas/data_export.py`.
- `SecurityHeadersMiddleware` como capa externa de `create_app()` (+ `vercel.json`) y tests
  `test_security_headers.py`; logs de realtime saneados en `routes/realtime.py` y
  `core/realtime.py`.
- Frontend: sección "Tus datos" con `app-data-download` (toast éxito/error) y
  `AuthService.exportMyData`; review-feedback aplicado (focus trap `appModalDialog`,
  `uniqueId`, `focusInput`, política de privacidad actualizada).
- Commits de la rama `feature/data-rights`: `8d7f034` (fix: no loguear payloads de mensajes),
  `c65f7c9` (feat: security headers), `b22cd71` (feat: descarga de datos) y `6cc1196`
  (fix: feedback de review sobre UI legal y export).

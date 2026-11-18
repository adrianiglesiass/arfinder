---
tag: SPECS/2026-10-fix-legal-exposure-public-profiles
estado: done
stack: ambos
fecha: 2026-10-31
---

# fix-legal-exposure-public-profiles

## Contexto
Arfinder está desplegado en producción (`https://arfinder.insforge.site` + `https://arfinder-api.fly.dev`)
con datos de personas reales (amigos del autor). La auditoría del repositorio y de la API en vivo
detectó tres exposiciones que contradicen la propia Política de privacidad:

1. `GET /profiles` y `GET /profiles/{id}` usan `get_current_user_optional`: sin token devuelven nombre,
   edad, ciudad, género, presupuesto y `photo_urls`. Con `skip`/`limit` (hasta 100) y IDs secuenciales
   el directorio completo es descargable en bucle. Verificado en producción.
2. No hay `robots.txt`, `noindex` ni `X-Robots-Tag`: la SPA y la API son indexables.
3. El Aviso legal y la Política de privacidad publican el NIF y el domicilio exacto del titular
   (persona física, repo público).

La Política de privacidad §5 declara visibilidad "para otros usuarios", más una excepción de detalle
por enlace; la realidad es un directorio público enumerable. El consentimiento registrado
(`terms_accepted_at`, `terms_version`) cubre el uso de la app, no la publicación abierta.

## Decisión
Se cierra el acceso a perfiles a usuarios autenticados. Se descarta ofuscar (UUIDs) porque mantiene
la publicación abierta de datos personales de terceros y obliga a una migración con FKs; cerrar el
acceso es la medida de minimización (art. 25 RGPD) y es lo que la política ya promete.

Consecuencia asumida: un enlace a `/perfil/:id` deja de ser compartible con alguien sin cuenta.
Es un cambio de producto deliberado; se actualizan README y documentos legales.

## Alcance
Backend:
- `app/routes/profile.py`: `search` (`GET /profiles`) y `get_public_profile` (`GET /profiles/{id}`)
  pasan a `Depends(get_current_user)`; se elimina el uso de `get_current_user_optional` en el módulo.
  `search` filtra bloqueos sin rama `None`. El detalle responde siempre `Cache-Control: private, no-store`.
  Actualizar `responses` para documentar 401.
- `app/core/security_headers.py`: añadir `X-Robots-Tag: noindex, nofollow` a `BASE_SECURITY_HEADERS`.
- `app/core/constants.py`: `CURRENT_TERMS_VERSION = "1.1.0"`.

Frontend:
- `app.routes.ts`: la ruta padre `''` (Layout) pasa a `canActivate: [authGuard, profileGuard]`, lo que
  cubre `/explorar` y `/perfil/:id`. Las páginas legales siguen públicas.
- `core/constants/legal-info.ts`: `controller` pierde `taxId` y `address`, gana `country`;
  `version` y `lastUpdated` a `1.1.0` / `2026-10-31`.
- `features/legal/legal-notice/legal-notice.html` y `features/legal/privacy/privacy.html`: dejar de
  mostrar NIF y domicilio; mostrar país.
- `features/legal/legal.spec.ts`: ajustar la aserción de `taxId`.
- `public/robots.txt` nuevo: `User-agent: *` + `Disallow: /`.
- `index.html`: `<meta name="robots" content="noindex, nofollow" />`.
- `public/vercel.json`: añadir `X-Robots-Tag` a las cabeceras existentes.

Documentación legal:
- `docs/legal/privacy_policy.md` §5: perfiles visibles solo para usuarios registrados; eliminar la
  excepción de consulta sin sesión. §1: sin NIF ni domicilio; contacto por email. §6: corregir la
  tabla de destinatarios (el frontend lo sirve InsForge, no Vercel). Versión 1.1.0.
- `docs/legal/legal_notice.md`: sin NIF ni domicilio exacto; identificación por nombre, país y email.
  Versión 1.1.0.
- `docs/legal/processing_register.md` nuevo: registro de actividades de tratamiento (art. 30 RGPD).
- `docs/legal/README.md`: reflejar el registro y el estado de los DPAs pendientes.
- `README.md`: eliminar la sección Demo (vídeo con caras reales) y la viñeta de navegación pública.

Tests:
- `tests/profiles/test_search.py`: el caso anónimo pasa a esperar 401.
- `tests/profiles/test_blocks.py`: `test_anonymous_profile_detail_stays_public` pasa a esperar 401 y
  `test_search_anonymous_still_sees_blocked` se sustituye por su equivalente autenticado.

## No-goals
- No migrar IDs secuenciales a UUID (con el acceso cerrado deja de ser enumerable).
- No firmar las URLs de Cloudinary ni cambiar su entrega.
- No tocar el flujo de consentimiento, exportación ni borrado de cuenta.
- No añadir banner de cookies (no hay analítica ni cookies no necesarias).
- No reescribir el historial de git para purgar el NIF ya publicado.

## Criterios de aceptación
- DADO un cliente sin token, CUANDO llama `GET /profiles` o `GET /profiles/{id}`, ENTONCES recibe 401.
- DADO un usuario autenticado, CUANDO busca perfiles, ENTONCES recibe el mismo resultado que antes,
  con sus bloqueos excluidos.
- DADO un visitante sin sesión, CUANDO abre `/explorar` o `/perfil/1`, ENTONCES es redirigido al login.
- DADO cualquier respuesta HTTP del backend, ENTONCES incluye `X-Robots-Tag: noindex, nofollow`.
- DADO el Aviso legal y la Política de privacidad renderizados, ENTONCES no contienen NIF ni domicilio.
- DADO un usuario con `terms_version = 1.0.0`, CUANDO entra, ENTONCES se le pide aceptar la versión 1.1.0.
- DADO `frontend/public/robots.txt`, ENTONCES bloquea todo el rastreo.

## Decisión técnica
- Versión legal: `CURRENT_TERMS_VERSION` y `LEGAL_DOCS_VERSION` deben coincidir; el backend se despliega
  primero. El bump fuerza re-consentimiento, que es lo correcto porque cambia la visibilidad del perfil.
- `X-Robots-Tag` se pone en el middleware y no por ruta: la API no debe indexarse nunca, y así no se
  puede olvidar en un endpoint nuevo.

## Plan de tests
- Backend: `tests/profiles` cubre 401 anónimo en búsqueda y detalle, y búsqueda autenticada con bloqueos.
- Frontend: `legal.spec.ts` valida que no se renderiza NIF y sí el país.

## Checklist de verificación
- [x] Backend: `make lint`
- [x] Backend: `make format-check`
- [x] Backend: `make test`
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`

## Resultado
Implementado. Backend: búsqueda y detalle exigen `get_current_user` (401 anónimo), bloqueos sin rama
anónima, detalle siempre `private, no-store`, `X-Robots-Tag: noindex, nofollow` en el middleware.
Frontend: `/explorar` y `/perfil/:id` detrás de `authGuard`, `robots.txt` con `Disallow: /`, meta
`noindex`, y los datos del titular sin NIF ni domicilio. Legal: política, términos y aviso a 1.1.0
(`CURRENT_TERMS_VERSION` y `LEGAL_DOCS_VERSION` alineados), tabla de destinatarios corregida
(InsForge sirve el frontend) y registro de actividades del art. 30 en `docs/legal/processing_register.md`.
README sin el vídeo demo y sin la viñeta de navegación pública.

Verificación: backend 260 tests, frontend 218 tests, ruff y prettier limpios. `make format-check`
no existía en `backend/Makefile` pese a pedirlo `AGENTS.md`; se añadió como alias de
`ruff format --check`.

Pendiente fuera de esta spec:
- Desplegar el backend **antes** del frontend (el consentimiento 1.1.0 lo emite la API).
- El NIF y el domicilio siguen en el historial de git (commit `2187889`); purgarlos requiere reescribir
  el historial y no se aborda aquí.
- Las URLs de Cloudinary ya publicadas son descargables sin firma; cerrar la API no revoca lo copiado.
- Confirmar DPAs y región de Cloudinary (checklist de `docs/legal/README.md`).

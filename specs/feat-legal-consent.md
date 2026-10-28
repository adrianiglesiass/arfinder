---
tag: SPECS/2026-10-feat-legal-consent
estado: done
stack: ambos
fecha: 2026-10-28
---

# feat-legal-consent

## Contexto
- `feat-legal-pages` publica las páginas legales y define `LEGAL_DOCS_VERSION`/`LEGAL_INFO`
  en `frontend/src/app/core/constants/legal-info.ts`, pero no existe registro de aceptación:
  la tabla `user` no guarda evidencia del consentimiento.
- El registro de usuario y el onboarding (`/bienvenida`, 4 pasos) crean el perfil con
  `POST /profiles/me` sin que nadie haya aceptado explícitamente los Términos ni declarado
  ser mayor de edad.
- Cuentas existentes creadas antes de este cambio no tienen constancia de aceptación; si se
  publica una nueva versión de los documentos, nadie se re-entiende.

## Problema
Sin registro de consentimiento (fecha + versión) la app no tiene base legal demostrable para
tratar datos personales ni prueba de la declaración de mayoría de edad, y no puede exigir
re-aceptación al cambiar los documentos.

## Alcance
- **Backend**
  - Columnas `terms_accepted_at` (DateTime timezone, nullable) y `terms_version`
    (String(50), nullable) en `user` + migración Alembic `b7e4d2a91c35`.
  - `backend/app/core/constants.py`: `CURRENT_TERMS_VERSION = "1.0.0"` (en sync con
    `LEGAL_DOCS_VERSION` del frontend; subir ambos juntos).
  - Helper `has_accepted_current_terms(user)` en `backend/app/core/consent.py`.
  - `user_repository.update_terms_consent` y `auth_service.record_terms_consent`
    (re-aceptar sobreescribe versión y fecha).
  - Endpoint `POST /auth/me/consent` (`ConsentCreate`: `terms_version` que debe ser la
    versión vigente + `is_adult: Literal[True]`; `extra="forbid"`), respuesta `UserResponse`.
  - `UserResponse` expone `terms_accepted_at` y `terms_version`; `_serialize_utc` soporta
    datetimes naive y aware.
  - Guardia: `profile_service.create_profile` devuelve **403 `TERMS_NOT_ACCEPTED`**
    (`TermsNotAcceptedError`) si el usuario no tiene consentimiento vigente; la ruta
    `POST /profiles/me` documenta el 403 en OpenAPI.
  - Fixtures: `create_test_user(accepted_terms=True)` por defecto (evita romper las suites
    existentes que crean perfil) y fixture `no_consent_headers` para simular signup recién
    hecho sin consentir.
- **Frontend**
  - `needsTermsConsent(user, currentVersion)` en `core/legal/terms-consent.ts` (usuario sin
    `terms_accepted_at` o con versión distinta → debe consentir).
  - `AuthApiService.acceptTerms` → `POST /auth/me/consent`; `AuthService.acceptTerms`
    refresca `currentUser`; `api.types.ts` regenerado.
  - Checkbox `shared/components/terms-consent/` (`app-terms-consent`): PrimeNG checkbox con
    enlaces a `ROUTES.TERMS`/`ROUTES.PRIVACY`, mensajes de error con `aria-invalid`/
    `aria-describedby`.
  - Onboarding: checkbox en el **último paso**; `isCurrentStepValid` lo exige y `finish()`
    llama a `acceptTerms(LEGAL_DOCS_VERSION)` antes de `saveOnboarding`.
  - `layout/terms-reconsent-dialog/`: diálogo **bloqueante** (no dismissable) para usuarios
    existentes con perfil y sin consentimiento vigente; solo "Aceptar y continuar" o
    "Cerrar sesión"; montado en `layout` con `@defer`.
- **Tests**: `backend/tests/auth/test_consent.py`, `backend/tests/profiles/test_create_consent.py`,
  `core/legal/terms-consent.spec.ts`, `shared/components/terms-consent/terms-consent.spec.ts`,
  `layout/terms-reconsent-dialog/terms-reconsent-dialog.spec.ts` y `onboarding.spec.ts`.

## No-goals
- NO banner de reconsentimiento proactivo por email/push al subir versión (el diálogo
  bloqueante del layout cubre la sesión activa).
- NO auditar/exportar el consentimiento vía API (queda para `feat-data-rights`).
- NO migrar usuarios existentes a "aceptado": se les exige aceptar en su siguiente sesión.
- NO aceptar versiones anteriores ni parciales: solo la versión vigente.

## Criterios de aceptación
- DADO un signup válido CUANDO el usuarix completa el onboarding y marca el consentimiento
  del último paso ENTONCES el frontend envía `POST /auth/me/consent` con
  `terms_version = LEGAL_DOCS_VERSION` e `is_adult: true` ANTES de crear el perfil, y
  `POST /profiles/me` responde 200.
- DADO un usuario sin consentimiento vigente CUANDO llama a `POST /profiles/me` directamente
  ENTONCES responde 403 con code `TERMS_NOT_ACCEPTED`.
- DADO un usuario autenticado CUANDO envía `POST /auth/me/consent` con la versión vigente
  ENTONCES la respuesta `UserResponse` incluye `terms_accepted_at` (UTC) y `terms_version`.
- DADO el mismo usuario CUANDO repite la aceptación ENTONCES se sobreescribe con la fecha y
  versión nuevas (idempotente en resultado, no duplica evidencia).
- DADO un payload con `terms_version` distinta de `CURRENT_TERMS_VERSION` o `is_adult`
  distinto de `true` CUANDO llega al endpoint ENTONCES responde 422 de validación.
- DADO `POST /auth/me/consent` SIN token CUANDO se invoca ENTONCES responde 401.
- DADO un usuario existente con perfil CUANDO inicia sesión sin consentimiento vigente
  ENTONCES el diálogo de reconsentimiento se muestra bloqueante (sin cierre por overlay/Esc)
  y ofrece aceptar o cerrar sesión.
- DADO el diálogo CUANDO el usuarix marca el checkbox y acepta ENTONCES se llama
  `acceptTerms`, el diálogo desaparece y la app queda operativa.
- DADO el onboarding CUANDO el último paso no tiene el checkbox marcado ENTONCES no avanza
  ni crea el perfil y el foco va al checkbox con el error visible.

## Decisión técnica
- **Consentimiento en `user`, no en tabla aparte**: una única aceptación vigente por usuario
  (fecha + versión) es suficiente para la base legal; una tabla de auditoría de versiones se
  puede añadir después sin tocar el contrato actual.
- **Versión canónica dual**: `CURRENT_TERMS_VERSION` (backend) y `LEGAL_DOCS_VERSION`
  (frontend) deben subirse juntos; el backend valida que el `terms_version` enviado sea la
  vigente (defensa en profundidad, no confiar en el cliente).
- **Guardia en el service, no en la ruta**: `create_profile` valida el consentimiento para
  que cualquier llamante quede cubierto.
- **Diálogo en `layout` con `@defer`**: se monta en toda la app autenticada sin
  penalizar el bundle inicial.
- **Fixtures de test no rotas**: `accepted_terms=True` por defecto en `create_test_user`
  mantiene verdes las suites que solo quieren cubrir su feature; los casos negativos usan
  `no_consent_headers` (usuario `noconsent@test.com` sin consentir, independiente del
  usuario default).

## Plan de tests
- Backend (`tests/auth/test_consent.py`): aceptar y ver los campos en `/auth/me`; versión
  vieja → 422; `is_adult: false` → 422; sin token → 401.
- Backend (`tests/profiles/test_create_consent.py`): crear perfil sin consentir → 403
  `TERMS_NOT_ACCEPTED`; con `no_consent_headers` + aceptar → 200.
- Frontend: `terms-consent.spec.ts` (helper de estado), `terms-consent.spec.ts` (shared,
  estado/error/a11y), `terms-reconsent-dialog.spec.ts` (apertura, aceptar, logout, error).
  `onboarding.spec.ts` mockea un usuario ya consentido para neutralizar la puerta y poder
  testear la idempotencia de envío; el bloqueo real del último paso sin consentimiento está
  cubierto por la guarda 403 del backend (`test_create_consent.py`).

## Checklist de verificación
- [x] Backend: `make lint`
- [x] Backend: `make format-check`
- [x] Backend: `make test`
- [x] Backend: `make migrate` (migración `b7e4d2a91c35` verificada con `alembic upgrade
  head` sobre una DB limpia: un solo head)
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] `npm run generate:types` ejecutado (`api.types.ts` con `POST /auth/me/consent`)

## Resultado
- `user` con `terms_accepted_at`/`terms_version` (migración `b7e4d2a91c35`),
  `core/consent.py::has_accepted_current_terms`, `auth_service.record_terms_consent` y
  `POST /auth/me/consent`; `create_profile` devuelve 403 `TERMS_NOT_ACCEPTED` sin
  consentimiento vigente.
- Frontend: `TermsConsent` compartido (último paso del onboarding con foco al error),
  `TermsReconsentDialog` bloqueante en `layout`, `AuthService.acceptTerms`,
  `needsTermsConsent`; `api.types.ts` regenerado.
- Commits: `bbedb3a` (feat: registrar consentimiento + guardia), `2728cda` (feat: checkbox
  onboarding + diálogo de reconsentimiento), `863a0e0` (test: fixtures por defecto con
  aceptación) de la rama `feature/legal-consent`.

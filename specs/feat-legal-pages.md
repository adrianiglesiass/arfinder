---
tag: SPECS/2026-10-feat-legal-pages
estado: done
stack: frontend
fecha: 2026-10-28
---

# feat-legal-pages

## Contexto
- Arfinder no tiene ninguna página legal accesible desde la aplicación: ni política de
  privacidad, ni términos y condiciones, ni política de cookies/almacenamiento, ni aviso legal.
- Las fuentes de verdad del contenido son los markdown de `docs/legal/*.md`
  (`README.md`, `privacy_policy.md`, `terms_and_conditions.md`, `storage_policy.md`,
  `legal_notice.md`); el frontend las replica en HTML estático.
- Las tipografías (Plus Jakarta Sans, Playfair Display, Material Symbols Rounded) se cargan
  desde Google Fonts mediante `<link>` en `frontend/src/index.html`, lo que implica una
  petición a un tercero en cada carga (relevante para el aviso de cookies/privacidad).
- Precedente de rutas lazy: `app.routes.ts` con `loadComponent(() => import(...))` y constantes
  en `core/constants/routes.ts` (`ROUTES`).

## Problema
La app no publica sus textos legales enlazables, lo que impide cumplir el deber de
transparencia (RGPD/AEPD) y deja al usuario sin forma de consultar las condiciones que acepta
al registrarse. Además, las fuentes de Google Fonts son peticiones a terceros que la propia
política de cookies declara.

## Alcance
- **Páginas legales lazy** en `frontend/src/app/features/legal/`:
  - `privacy/` (Política de privacidad), `terms/` (Términos y condiciones),
    `cookies/` (Política de cookies/almacenamiento), `legal-notice/` (Aviso legal).
  - Layout compartido `components/legal-page-layout/`: `title` (input requerido),
    `lastUpdated` y `version` (con defaults de `LEGAL_INFO`), fecha formateada `es-ES` en UTC,
    logo + back-link + `app-legal-links`.
- **Rutas nuevas** lazy en `app.routes.ts`: `/privacidad`, `/terminos`, `/cookies`,
  `/aviso-legal`; constantes `ROUTES.PRIVACY | TERMS | COOKIES | LEGAL_NOTICE`.
- **Componente compartido** `shared/components/legal-links/` (`app-legal-links`): nav con
  `aria-label="Información legal"` que lista los 4 enlaces; integrado en `auth-form` (footer:
  "Al continuar aceptas los Términos y la Política de privacidad"), `profile-edit`,
  `sidebar-nav` (visible solo en `xl`) y el propio `legal-page-layout`.
- **Metadatos legales**: `core/constants/legal-info.ts` con `LEGAL_DOCS_VERSION = '1.0.0'`,
  `LEGAL_INFO` (responsable, NIF, domicilio, email de contacto — datos del responsable
  rellenados el 2026-10-28 — y autoridad supervisora AEPD) — única fuente de verdad del
  frontend, sincronizada con `docs/legal/*.md`.
- **Fuentes self-hosted**: dependencias `@fontsource-variable/plus-jakarta-sans`,
  `@fontsource/playfair-display` y `@fontsource-variable/material-symbols-rounded`;
  imports en `styles.css` (con espejo de la clase `.material-symbols-rounded` que antes
  inyectaba Google Fonts); eliminados los `<link>`/`preconnect` de Google Fonts de `index.html`
  (queda `lang="es"`); el service worker cachea `/media/**` además de los `woff|woff2` ya
  presentes en el patrón de assets (`ngsw-config.json`).
- **Limpieza menor incluida**: la clave `arfinder.exploreView` pasa a
  `STORAGE_KEYS.explore.viewMode` y `search-profile.ts` la reutiliza.

## No-goals
- NO modificar el backend ni el contrato de la API (sin regeneración de `api.types.ts`).
- NO implementar banner de cookies ni consentimiento de analítica (no hay cookies de terceros
  propias más allá de lo declarado).
- NO implementar el resto del checklist pre-producción de `docs/legal/README.md` (DPA de
  Cloudinary, revisión legal, etc. — fuera del alcance de este cambio).
- NO registrar consentimiento del usuario (queda para `feat-legal-consent`).
- NO añadir descarga de datos desde la política de privacidad (queda para `feat-data-rights`).

## Criterios de aceptación
- DADO un usuario sin sesión CUANDO visita `/privacidad`, `/terminos`, `/cookies` o
  `/aviso-legal` ENTONCES cada ruta renderiza su página lazy con el layout común
  (título, última actualización y versión).
- DADO cualquier página legal CUANDO se muestra ENTONCES los datos de cabecera (versión,
  última actualización, AEPD) provienen de `LEGAL_INFO` y no están duplicados en el template.
- DADO el formulario de login/registro CUANDO se renderiza ENTONCES el pie enlaza a
  Términos y Política de privacidad con `routerLink` a `ROUTES.TERMS`/`ROUTES.PRIVACY`.
- DADO la sidebar o `/perfil/editar` CUANDO se muestran ENTONCES aparece `app-legal-links`
  con los 4 enlaces (en la sidebar solo en breakpoints `xl`).
- DADO el `index.html` CUANDO se construye la app ENTONCES no hay ninguna petición a
  `fonts.googleapis.com`/`fonts.gstatic.com` y las fuentes se sirven desde el bundle propio.
- DADO el service worker CUANDO se instala ENTONCES los assets de `/media/**` y los `.woff2`
  quedan cacheados en la estrategia de assets.

## Decisión técnica
- **HTML estático en el template** en lugar de renderizar los markdown en runtime: sin
  dependencia de marked/renderer, SEO-friendly y cacheable; los markdown de `docs/legal/`
  siguen siendo la fuente de verdad de redacción y se replica el contenido.
- **`legal-page-layout` como layout por composición** (inputs `title`/`lastUpdated`/`version`)
  para no repetir cabecera/pie en 4 páginas; reutiliza `ArfinderLogo`, `BackLink` y
  `LegalLinks` ya existentes en `shared/components/`.
- **`LEGAL_INFO` como única fuente de verdad en frontend** del meta-dato legal; en
  `feat-legal-consent` se exportará `LEGAL_DOCS_VERSION` como versión de consentimiento.
- **Self-hosting con `@fontsource`** en vez de descargar manualmente los woff2: actualizable
  por npm, mismo CSS que Google Fonts servido localmente; la clase
  `.material-symbols-rounded` se replica en `styles.css` sin capa para conservar la cascada.
- **Rutas lazy sin guard**: las páginas legales son públicas por definición.

## Plan de tests
- `frontend/src/app/features/legal/legal.spec.ts` (Vitest): renderizado de las 4 páginas y
  presencia de los enlaces/contenido legal clave.
- Validación visual/manual de las 4 rutas y de los enlaces en auth-form, sidebar y
  profile-edit (revisión `ui-ux-reviewer`).

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Build: `npm run build` (producción)

## Resultado
- 4 páginas legales lazy + `legal-page-layout` + `app-legal-links` en `auth-form`,
  `profile-edit` y `sidebar-nav`; `ROUTES.PRIVACY/TERMS/COOKIES/LEGAL_NOTICE` en
  `core/constants/routes.ts` y `LEGAL_INFO`/`LEGAL_DOCS_VERSION` en
  `core/constants/legal-info.ts` (`LEGAL_INFO` con los datos del responsable del
  tratamiento).
- Fuentes self-hosted vía `@fontsource*` (`styles.css` + `index.html` sin Google Fonts;
  `ngsw-config.json` cachea `/media/**`); contenido fuente en `docs/legal/*.md`.
- Commits: `a58bfab` (chore: self-host fonts) y `e485507` (feat: páginas legales) de la rama
  `feature/legal-pages`.

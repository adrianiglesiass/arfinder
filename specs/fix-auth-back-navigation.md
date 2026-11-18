---
tag: SPECS/2026-11-fix-auth-back-navigation
estado: done
stack: frontend
fecha: 2026-11-18
---

# fix-auth-back-navigation

## Contexto
Las pantallas de autenticación (`/login`, `/registro`, `/verificar-email`) se pintan a pantalla completa
con `AuthCard`, sin navbar ni barra del navegador. Instalada como PWA (`display: standalone`,
`start_url: "/"`) no hay chrome del navegador, así que no existe ninguna forma de retroceder.

Además, hasta ahora no había ninguna ruta pública que sirviera de entrada: `/` exigía
`authGuard + profileGuard`, el comodín `**` redirige a `explorar` (también protegida) y las únicas
rutas anónimas eran las legales. Una instalación nueva aterrizaba directamente en `/login`.

## Problema
Un usuario anónimo que abre la PWA en frío queda encerrado en `/login`: no puede volver a ninguna
pantalla anterior ni salir del área de autenticación sin cerrar la app a mano.

## Alcance
- `AuthCard` incorpora una flecha "Volver" siempre visible, en las tres variantes (`login`, `register`,
  `verify`), en su propia fila sobre el logo para no competir por el ancho con la marca.
- `NavigationHistoryService` (nuevo, `core/navigation/`) registra en memoria la última URL visitada
  fuera del área de auth, con query string y fragmento incluidos, y la descarta en cuanto se pierde la
  sesión.
- Al tocar la flecha: si hay una URL previa registrada se navega a ella; si no la hay (cold start de la
  PWA), o si un guard cancela el destino, se navega a la landing pública `/`.
- En `verificar-email` la flecha vuelve al formulario de registro, que es el paso anterior real y
  permite corregir un email mal escrito.
- Nueva landing pública en `/` (`features/landing/`): logo, propuesta de valor, "Crear cuenta" como
  acción primaria, "Entrar" como secundaria y los documentos legales. Si el usuario ya tiene sesión,
  `guestGuard` lo redirige a `/explorar` antes de crearla.
- `guestGuard` pasa a redirigir a `/explorar` (antes `/`, que deja de ser el área privada).
- Los consumidores que usaban `/` como "raíz de la app privada" pasan a `/explorar`: `onboarding.ts`,
  `onboarding.guard.ts`, el logo de `navbar.html` y el de `sidebar-nav.html`.
- Se extrae `PageBackground` (`shared/components/`) con el fondo y los dos blobs que compartían
  `AuthCard` y la landing, con `align` (`center` por defecto, `start` en la landing para poder reservar
  el alto del banner de instalación), y `IconButton` gana `shape` (`square` por defecto, `circle` en la
  flecha) y anillo de `focus-visible` consistente con el resto de la app.
- La flecha comparte fila con el logo en una grilla de columnas simétricas
  (`[48px_minmax(0,1fr)_48px]`), así la cabecera no crece en vertical y el solape deja de ser posible
  por construcción en cualquier ancho.

## No-goals
- NO se usa `window.history.back()` ni `Location.back()`: con una sola entrada en el historial no hace
  nada, que es exactamente el caso que se quiere resolver.
- NO se toca la lógica de login, registro, OAuth ni verificación por código.
- NO se añade una landing con secciones de marketing (planes, testimonios, FAQ): solo el hero mínimo.
- NO se modifica el `redirect` post-login que ya está pendiente en la rama
  `fix/legal-exposure-public-profiles`.
- El historial es por pestaña y en memoria: un reload intencionalmente lo vacía.

## Criterios de aceptación
- DADO la PWA instalada recién abierta CUANDO el usuario anónimo cae en `/login` ENTONCES ve la flecha
  "Volver" y al tocarla llega a la landing pública.
- DADO que el usuario venía de `/privacidad` CUANDO toca la flecha en `/login` ENTONCES vuelve a
  `/privacidad`, no a la landing.
- DADO que el usuario venía de `/perfil/7` CUANDO toca la flecha en `/registro` ENTONCES vuelve a
  `/perfil/7`.
- DADO que el usuario venía de `/explorar?ciudad=Madrid` CUANDO toca la flecha ENTONCES vuelve con el
  filtro aplicado.
- DADO que la sesión se perdió en `/mensajes` CUANDO toca la flecha en `/login` ENTONCES aterriza en la
  landing, nunca en la pantalla privada que ya no puede abrir.
- DADO la pantalla "Verifica tu email" CUANDO toca la flecha ENTONCES vuelve al formulario de registro.
- DADO un usuario con sesión CUANDO abre `/` ENTONCES es redirigido a `/explorar` sin ver la landing.
- DADO un usuario con sesión CUANDO abre `/login` ENTONCES es redirigido a `/explorar`.
- DADO un viewport de 360 px CUANDO se ve cualquier pantalla de auth ENTONCES la flecha mide al menos
  44×44 px, no se solapa con el logo y no genera scroll horizontal.
- DADO un lector de pantalla CUANDO enfoca la flecha ENTONCES anuncia "Volver" y muestra un anillo de
  foco visible.

## Decisión técnica
- `NavigationHistoryService` (`@Injectable({ providedIn: 'root' })`) se suscribe a `NavigationEnd` y
  guarda `urlAfterRedirects` completo en un `signal`. La deduplicación es por URL exacta, así que
  cambiar filtros en la misma página actualiza el destino. Un `effect` sobre
  `AuthService.currentUser()` limpia el historial en la **transición** de sesión a `null` (logout,
  expiración, borrado de cuenta). Se mira la transición y no el valor porque `currentUser` arranca en
  `null` hasta que resuelve el bootstrap: mirar el valor borraría la URL recién grabada en la primera
  navegación. La dependencia va del historial hacia la sesión, nunca al revés, para no crear un ciclo
  de DI.
- `app.config.ts` lo instancia en `provideAppInitializer`, junto a `AuthService.init()`, para que
  registre la primera navegación; sin eso solo empezaría a grabar al montarse una pantalla de auth.
- La flecha es un `<button type="button">` (no un `<a>`), porque el destino es dinámico; usa
  `IconButton` con el icono `pi pi-arrow-left` que ya emplea `app-back-link`.
- `onBack()` comprueba el resultado de `navigateByUrl`: si el intento quedó mudo y la app sigue en una
  ruta de auth, cae a `/`. Si el guard ya redirigió (por ejemplo `guestGuard` a `/explorar`), no se
  añade un salto extra. Sin ese control la flecha quedaría muda justo en el escenario que motiva la
  feature.
- La landing reutiliza `ArfinderLogo`, `app-button`, `app-legal-links` y `PageBackground`; no introduce
  librerías, colores ni espaciados nuevos.

## Plan de tests
- `navigation-history.service.spec.ts`: registra `urlAfterRedirects`, conserva query y fragmento,
  ignora rutas de auth, ignora duplicados exactos, se limpia al perder la sesión y con `reset()`.
- `guest-guard.spec.ts`: deja pasar a anónimos y manda a `/explorar` a los autenticados.
- `auth-card.spec.ts`: flecha presente y `type="button"` en las tres variantes, navega a la URL previa,
  conserva el query, cae a `/` sin historial, vuelve a `/registro` desde `verify` y cae a `/` si un
  guard cancela el destino.
- `landing.spec.ts`: renderiza ambos CTAs, cada uno navega a su destino, y `/` queda registrada como
  ruta pública servida por `guestGuard`.
- Verificación de la Sección 6: `npm run format:check && npm run lint && npm run test:ci` desde
  `frontend/`.

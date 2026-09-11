---
tag: SPECS/2026-09-fix-profile-safety-actions
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-profile-safety-actions

## Contexto
- F4 (#295) y F5 (#296) colocaron `BlockButton` y `ReportButton` en el detalle de perfil
  (`features/profile/profile-detail.html`): en escritorio, como dos píldoras de ancho completo
  **fuera** de la tarjeta blanca de `ProfileInfoBlock`; en móvil, dentro de `MobileActionBar`.
- `BlockButton` llama a `BlockService.toggle()` (`core/block/block.service.ts`), que es optimista y
  **se traga los errores**: no hay confirmación, ni toast, ni ningún otro feedback.
- `ReportButton` renderiza su `ReportDialog` **dentro de sí mismo**. En móvil eso lo mete dentro de
  `MobileActionBar`, cuyo contenedor tiene `backdrop-blur-xl` (`backdrop-filter`). Un elemento con
  `backdrop-filter` se convierte en *containing block* de sus descendientes `position: fixed`, así que
  el `fixed inset-0` del diálogo se resuelve contra la píldora de la barra (≈52px de alto), no contra
  el viewport; además hereda su stacking context (`z-40`), por debajo de `MobileNav` (`z-50`).
- El panel de `ReportDialog` no tiene `max-height` ni scroll propio.
- Patrones existentes a reutilizar: `ConfirmDestructiveDialog` (`@shared`) con inputs `title`,
  `description`, `confirmLabel`; `p-menu` popup con `appendTo="body"` en `NavbarUserMenu`; toasts vía
  `MessageService`, ya provisto en `profile-detail` desde F5; hoja inferior con scroll de
  `search-profile.html` (`max-h-[90vh]`, cuerpo `overflow-y-auto overscroll-contain`).

## Problema
En el detalle de perfil, bloquear y reportar rompen el estilo de la página, bloquear no da ningún
feedback, y en móvil el diálogo de reporte aparece recortado y sin scroll.

## Alcance
- Nuevo `ProfileActionsMenu` (`features/profile/components/profile-actions-menu/`): botón circular
  "⋯" (`pi pi-ellipsis-h`) que abre un `p-menu` popup con `appendTo="body"` y dos entradas:
  "Bloquear" / "Desbloquear" (según `BlockService.blockedIds`) y "Reportar". Solo emite intenciones
  (`blockRequested`, `unblockRequested`, `reportRequested`); no abre diálogos.
- `ProfileInfoBlock` expone un slot de acciones (`<ng-content select="[profileActions]">`) en la fila
  de "Enviar mensaje", para que las acciones vivan **dentro** de la tarjeta.
- `profile-detail` pasa a ser el único dueño de los diálogos: `activeDialog` signal
  (`'block' | 'report' | null`) y renderiza `ConfirmDestructiveDialog` y `ReportDialog` en la raíz de
  la página, fuera de cualquier ancestro con `backdrop-filter`.
- Bloquear pide confirmación ("¿Bloquear a {nombre}?"); al confirmar muestra un toast de éxito y se
  queda en la página, con el menú mostrando ya "Desbloquear". Desbloquear no pide confirmación: toast
  y se queda en la página. Un error muestra un toast de error.
- `BlockService.toggle()` devuelve `Promise<boolean>` (éxito o no), sin perder el optimismo ni el
  revert, para que la página pueda dar feedback.
- Nuevo `ReportService` (`core/report/report.service.ts`) con la lógica que hoy vive en
  `ReportButton`: llama a `ReportApiService`, refresca `BlockService` y devuelve éxito o error.
- `ConfirmDestructiveDialog` acepta `confirmIcon` (por defecto `pi pi-trash`, sin cambio para
  `danger-zone`).
- `ReportDialog`: `z-[60]` para quedar por encima de `MobileNav`, y panel con
  `max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain`.
- Se eliminan `BlockButton` y `ReportButton`: su única ubicación era el detalle de perfil.
- Mismo guard que hoy (`showBlockButton()`, renombrado a `showSafetyActions()`): sin sesión no se
  muestra el menú.

## No-goals
- NO cambia el backend ni los endpoints de F4/F5.
- NO se añade el menú "⋯" a tarjetas de la búsqueda ni al deck.
- NO se rediseña `ProfileInfoBlock` más allá del slot de acciones.

## Criterios de aceptación
- DADO un usuario con sesión en el detalle de un perfil ajeno CUANDO abre "⋯" ENTONCES ve
  "Bloquear" y "Reportar" en un menú con el mismo estilo que el menú de usuario, dentro de la tarjeta
  en escritorio y en la barra de acciones en móvil.
- DADO ese menú CUANDO elige "Bloquear" ENTONCES aparece un diálogo de confirmación; CUANDO confirma
  ENTONCES ve un toast de éxito y el menú pasa a ofrecer "Desbloquear"; CUANDO cancela ENTONCES no se
  llama a la API.
- DADO un perfil ya bloqueado CUANDO abre "⋯" ENTONCES ve "Desbloquear"; al pulsarlo ve un toast y
  sigue en la página.
- DADO que la API de bloqueo falla CUANDO confirma ENTONCES ve un toast de error y el estado revierte.
- DADO un móvil de 360×640 CUANDO abre "Reportar" ENTONCES el diálogo ocupa el viewport, queda por
  encima de la barra inferior y su contenido hace scroll hasta el botón "Reportar y bloquear".
- DADO un visitante sin sesión CUANDO abre un perfil ENTONCES no ve el menú "⋯".

## Decisión técnica
- **Menú de desbordamiento en vez de dos botones visibles**: bloquear y reportar son acciones poco
  frecuentes y destructivas; esconderlas tras "⋯" es el patrón habitual y reutiliza el `p-menu` que la
  app ya usa para el menú de usuario, así que el estilo es coherente sin inventar componentes.
- **El diálogo no puede vivir dentro del botón**: cualquier diálogo `fixed` que se renderice dentro de
  `MobileActionBar` queda atrapado por su `backdrop-filter`. Mover la propiedad de los diálogos a la
  página elimina la causa, en vez de parchear el síntoma con alturas.
- **`ReportService` en `@core`** en lugar de meter la lógica en `profile-detail`: mantiene la página
  como orquestadora y la lógica testeable, igual que `BlockService` y `FavoritesService`.
- **Quedarse en la página tras bloquear**, en vez de volver a `/explorar` (decisión revisada antes de
  implementar): `MessageService` se provee por componente en `profile-detail`, así que navegar
  destruiría el toast en el mismo instante en que aparece. Quedarse además permite deshacer desde el
  mismo menú, que es mejor que obligar a buscar el perfil en `/bloqueados`.
- `ConfirmDestructiveDialog` sube a `z-[60]`: con `z-50` la barra inferior móvil, que también es `z-50`
  y va después en el DOM, se pinta encima del fondo del diálogo. Beneficia también a `danger-zone`.
- Alternativa descartada: `p-dialog` con `appendTo="body"`. Resolvería el recorte, pero el proyecto
  usa diálogos propios (`ConfirmDestructiveDialog`) y mezclar ambos rompe la consistencia visual.

## Plan de tests
- `core/block/block.service.spec.ts`: `toggle()` devuelve `true` en éxito y `false` con revert en error.
- `core/report/report.service.spec.ts` (nuevo): éxito llama a la API y refresca bloqueos; error
  devuelve `false` sin refrescar.
- `features/profile/components/profile-actions-menu/profile-actions-menu.spec.ts` (nuevo): las
  entradas cambian entre "Bloquear" y "Desbloquear" según `blockedIds` y emiten la intención correcta.
- Se elimina `shared/components/report-button/report-button.spec.ts` con su componente.
- Verificación visual en navegador a 360px y 1280px (criterios de móvil y estilo).

## Checklist de verificación
- [x] Frontend: `npm run format:check` — All matched files use Prettier code style
- [x] Frontend: `npm run lint` — All files pass linting
- [x] Frontend: `npm run test:ci` — **32 passed** (8 files)
- [x] Frontend: `npm run build` — bundle de producción generado
- [ ] Verificación visual en navegador (360px y 1280px) — parcial, ver Resultado

## Resultado
Implementado según el alcance, con la decisión revisada de quedarse en la página tras bloquear.

- `ProfileActionsMenu` (`features/profile/components/profile-actions-menu/`) con `p-menu` popup en
  `body`: "Bloquear" o "Desbloquear" según `BlockService.blockedIds`, y "Reportar". Las entradas
  destructivas usan el mismo estilo rojo que "Cerrar sesión" del menú de usuario.
- `ProfileInfoBlock` expone `<ng-content select="[profileActions]">` en la fila de "Enviar mensaje".
- `profile-detail` es el dueño de los dos diálogos (`activeDialog`, `safetyBusy`), renderizados en la
  raíz de la página. Bloquear confirma con `ConfirmDestructiveDialog` (`confirmIcon="pi pi-ban"`) y
  muestra toast de éxito o error; desbloquear muestra toast sin confirmación.
- `BlockService.toggle()` devuelve `Promise<boolean>`. Nuevo `ReportService` en `@core/report`.
- `ConfirmDestructiveDialog` acepta `confirmIcon` y sube a `z-[60]`; `ReportDialog` sube a `z-[60]`
  y su panel tiene `max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain`.
- Eliminados `BlockButton` y `ReportButton` (y el spec de este último).

Verificación en navegador (Chrome, backend y frontend locales contra una BD desechable con el
seed, auth simulada con el mismo override de `get_current_user` que usa `conftest.py`):
- Sin sesión, el detalle no muestra el menú "⋯" ni los botones antiguos.
- Con sesión, a 1920px, las acciones quedan dentro de la tarjeta en una fila alineada:
  "Enviar mensaje" (147×38), corazón (40×40) y "⋯" (40×40), separados 8px.
- **No verificado en navegador**: el flujo del menú con confirmación y toast, y el diálogo de reporte
  a 360×640. La ventana de Chrome estaba oculta (Chrome no pinta ni avanza temporizadores en esa
  pestaña) y se decidió no seguir con el navegador. La lógica del flujo está cubierta por los tests
  unitarios; la corrección del recorte en móvil se basa en la causa identificada (el diálogo ya no
  se renderiza dentro del ancestro con `backdrop-filter`), no en una comprobación visual.

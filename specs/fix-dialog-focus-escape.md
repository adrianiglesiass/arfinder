---
tag: SPECS/2026-10-fix-dialog-focus-escape
estado: done
stack: frontend
fecha: 2026-10-15
---

# fix-dialog-focus-escape

## Contexto
Hay tres diálogos modales (`role="dialog"` + `aria-modal="true"`):
- `ConfirmDestructiveDialog` (`shared/components/confirm-destructive-dialog`): bloquear, eliminar cuenta,
  cancelar registro.
- `ReportDialog` (`shared/components/report-dialog`): reportar perfil.
- La hoja de filtros móvil de `features/search-profile/search-profile.html`.

Los tres comparten el mismo patrón: un `<button>` de fondo con `(keyup.escape)` y el panel. Ninguno
mueve el foco al abrirse, ni lo encierra, ni lo devuelve al cerrarse.

## Problema
- Escape solo cierra si el foco está justo en el botón de fondo, cosa que nunca pasa: al abrir, el foco
  se queda en el botón que abrió el diálogo, detrás del velo.
- Con Tab el foco sale del diálogo y recorre la página de detrás; al cerrar, el foco se pierde.
- El diálogo de reporte hace scroll entero (cabecera, motivos y botones): en móvil, con el teclado
  abierto, "Reportar y bloquear" queda fuera de la vista.

## Alcance
- Una directiva compartida `ModalDialog` (`shared/directives/modal-dialog.ts`) que se pone en el
  elemento `role="dialog"`:
  - al abrir, enfoca el primer elemento enfocable (o el propio panel);
  - Escape en cualquier parte del documento emite `escaped`;
  - Tab / Mayús+Tab quedan encerrados dentro del panel;
  - al destruirse, devuelve el foco al elemento que lo tenía antes de abrir.
- Se aplica a los tres diálogos; se quitan los `(keyup.escape)` del fondo.
- `ReportDialog`: cabecera y motivos en una zona con scroll, y un pie fijo con "Cancelar" y
  "Reportar y bloquear".

## No-goals
- NO se migra a `p-dialog` de PrimeNG ni a `@angular/cdk/a11y`: la directiva es pequeña y se ajusta al
  marcado que ya existe (CDK `FocusTrap` no gestiona Escape ni la devolución del foco).
- NO se cambian los textos ni el aspecto de los diálogos, salvo el pie del de reporte.

## Criterios de aceptación
- DADO un diálogo abierto CUANDO pulso Escape ENTONCES se cierra (salvo mientras procesa, como hoy).
- DADO un diálogo abierto ENTONCES el foco está dentro del panel; con Tab desde el último elemento vuelve
  al primero y con Mayús+Tab desde el primero va al último.
- DADO un diálogo que se cierra ENTONCES el foco vuelve al botón que lo abrió.
- DADO el diálogo de reporte en una pantalla baja ENTONCES los botones siguen visibles y solo hace scroll
  el contenido.

## Decisión técnica
- Directiva standalone con `host` (`document:keydown`), `afterNextRender` para el foco inicial y
  `DestroyRef` para devolverlo. Los componentes de diálogo enlazan `(escaped)` a su `onCancel()`, que ya
  ignora la petición mientras `isDeleting`/`isSubmitting`.
- `ReportDialog`: el panel pasa a `flex flex-col` con `overflow-hidden`; el cuerpo `flex-1 min-h-0
  overflow-y-auto` y el pie `shrink-0` con borde superior.

## Plan de tests
- `shared/directives/modal-dialog.spec.ts`: foco inicial, Escape, ciclo de Tab en ambos sentidos y
  devolución del foco al destruir.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Build: `ng build --configuration production`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → APROBADO CON CAMBIOS** (sin bloqueantes) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES** (sin bloqueantes). Cambios aplicados tras ella:
- la directiva ignora un Escape que ya ha gestionado un widget interior (`defaultPrevented`): cerrar la
  lista del autocompletado de ciudad ya no cierra toda la hoja de filtros;
- solo el diálogo de más arriba reacciona al teclado (pila de diálogos abiertos);
- el ciclo de Tab salta elementos ocultos (`checkVisibility`);
- `ConfirmDestructiveDialog` y `ReportDialog` usan ids únicos por instancia (`uniqueId`) y los botones de
  motivo del reporte tienen anillo de foco.

Aceptado sin cambios: si el elemento que abrió el diálogo ya no existe al cerrarse (p. ej. la papelera de
una foto recién borrada), el foco no se devuelve a ningún sitio concreto.

- `shared/directives/modal-dialog.ts` aplicada a los tres diálogos; pie fijo en el de reporte.
- `modal-dialog.spec.ts`: 9 tests (foco inicial, Escape, Escape ya gestionado, ciclo de Tab, diálogos
  apilados y devolución del foco).

Verificación final: `format:check`, `lint`, `test:ci` (**139 tests**, 23 archivos) y build de
producción.

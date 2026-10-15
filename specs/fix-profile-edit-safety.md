---
tag: SPECS/2026-10-fix-profile-edit-safety
estado: done
stack: frontend
fecha: 2026-10-15
---

# fix-profile-edit-safety

## Contexto
`features/profile/edit/profile-edit.ts` y el formulario compartido `StepProfile`
(`shared/components/profile-form/step-profile`), que también usa el onboarding:
- "Guardar" (cabecera y barra móvil) está `[disabled]="!canSave()"`, y `canSave` exige `isValid`. El
  código de `save()` que pone `showErrors` y lleva a la sección con errores nunca se ejecuta.
- El aviso de la ciudad usa `[class.ring-1.ring-red-400.rounded-2xl]`: Angular no admite varias clases
  en `[class.x]`, así que el borde rojo nunca aparece.
- La edad solo se valida como "no vacía"; el backend exige 18–120 y responde 422.
- Salir de `/perfil` (botón Volver, menú, recarga) con cambios sin guardar los pierde sin avisar.
- `PhotosEditor` borra la foto en cuanto se toca la papelera; en móvil la papelera está siempre visible.
- Ningún campo limita la longitud; el backend limita `name` y `city` a 100 (PR #302), `bio` a 2000 y
  `room_description` a 3000.

## Problema
El usuario no ve por qué no puede guardar, pierde cambios sin aviso, borra fotos por un toque accidental y
puede escribir textos que el servidor rechaza.

## Alcance
- "Guardar" solo se desactiva si no hay cambios o se está guardando; con datos inválidos, `save()` muestra
  los errores y lleva a "Información".
- `StepProfile`: el aviso de ciudad funciona; la edad muestra "Debes tener entre 18 y 120 años"; los
  campos con error llevan `aria-invalid` y `aria-describedby`.
- Límites compartidos en `shared/utils/profile-limits.ts` (`PROFILE_LIMITS` e `isProfileBasicsValid`),
  usados por editar perfil y el onboarding, y `maxlength` en nombre (100), ciudad (100), biografía (2000)
  y descripción de la habitación (3000).
- Guard `unsavedChangesGuard` (`CanDeactivateFn`) en `/perfil`: con cambios sin guardar pide confirmación
  con `ConfirmDestructiveDialog` ("¿Salir sin guardar?"). Además, `beforeunload` avisa al recargar o
  cerrar la pestaña. Si la sesión ya no existe (cerrar sesión, cuenta eliminada) no pregunta.
- `PhotosEditor`: la papelera abre `ConfirmDestructiveDialog` ("¿Eliminar esta foto?") y solo borra al
  confirmar.

## No-goals
- NO se guarda un borrador de los cambios.
- NO se pide confirmación al quitar fotos locales del onboarding (aún no están subidas).

## Criterios de aceptación
- DADO un cambio que deja el nombre vacío CUANDO pulso Guardar ENTONCES veo "Campo obligatorio" y no se
  envía nada.
- DADO una edad de 17 ENTONCES veo el aviso de rango y no se envía nada.
- DADO cambios sin guardar CUANDO navego a otra sección ENTONCES se pregunta; "Cancelar" me deja en la
  página con los cambios y "Salir sin guardar" navega.
- DADO que no hay cambios ENTONCES se navega sin preguntar.
- DADO una foto subida CUANDO toco la papelera ENTONCES se pide confirmación y solo se borra al aceptar.
- DADO el nombre o la ciudad ENTONCES no se pueden escribir más de 100 caracteres.

## Decisión técnica
- El guard es genérico (`core/navigation/unsaved-changes.guard.ts`) sobre una interfaz `PendingChanges`
  con `canLeave(): boolean | Promise<boolean>`; el componente decide cómo preguntar. Se reutiliza
  `ConfirmDestructiveDialog` en lugar de `window.confirm`, que rompe el estilo y no se puede probar bien.
- Si llega una segunda navegación con la pregunta abierta, la primera se resuelve como `false`.
- `CityAutocomplete` gana las entradas `inputId` y `maxlength`, que pasa a `p-autoComplete`.

## Plan de tests
- `features/profile/edit/profile-edit.spec.ts` (nuevo): guardar con datos inválidos muestra errores y no
  llama a `updateProfile`; `canLeave()` sin cambios es `true`; con cambios abre el diálogo y resuelve según
  la respuesta; sin sesión es `true`.
- `features/profile/edit/photos-editor/photos-editor.spec.ts` (nuevo): la papelera no borra hasta
  confirmar; cancelar no borra.
- `shared/utils/profile-limits.spec.ts` (nuevo): límites de edad y campos obligatorios.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Build: `ng build --configuration production`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → APROBADO CON CAMBIOS** (sin bloqueantes) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES** (sin bloqueantes). Cambios aplicados tras ella:
- al guardar con errores, el foco va al primer campo inválido (además del scroll);
- el aviso de ciudad se lee con el campo: el autocompletado recibe `ariaLabelledBy` con la etiqueta y el
  error (PrimeNG no expone `aria-describedby` en `p-autoComplete`);
- el anillo rojo de la ciudad usa `[class.ring-1]`/`[class.ring-red-400]`;
- salir mientras se está guardando no pregunta.

- `shared/utils/profile-limits.ts` (límites y `isProfileBasicsValid`), `core/navigation/unsaved-changes.guard.ts`,
  confirmación al borrar foto en `PhotosEditor` y `maxlength` en nombre, ciudad, biografía y habitación.
- Tests nuevos: `profile-edit.spec.ts` (11), `photos-editor.spec.ts` (3) y `profile-limits.spec.ts` (2).

Verificación final: `format:check`, `lint`, `test:ci` (**139 tests**, 23 archivos) y build de
producción.

---
tag: SPECS/2026-10-fix-pending-photos-post-upload-residue
estado: done
stack: frontend
fecha: 2026-10-28
---

# fix-pending-photos-post-upload-residue

## Contexto
La spec `fix-pending-photos-cleanup` (PR #288) hizo que `OnboardingPersistenceService.clearAll()`
borre también de `localStorage` las claves de fotos pendientes (`arfinder_pending_photos`,
`arfinder_pending_photos_order`). En el onboarding, `nextStep()` llama a `clearAll()` justo después de
`saveOnboarding()`, pero **antes** de subir las fotos: `StepPhotos.uploadPendingPhotos()` vuelve a
persistir el orden (`persistOrder`, `step-photos.ts`) y el payload (`persistLocalPhotos`) después de
esa limpieza, y `reorderPhotos()` también reescribe el orden.

## Problema
Al terminar el onboarding con fotos, las claves de `localStorage` quedan de nuevo pobladas con el
residuo del upload (orden con ids remotos y payload ya vacío/partial), de modo que
`PhotoStorageService.load()` las lee en la próxima sesión en lugar de encontrar el almacenamiento limpio
que `clearAll()` garantizaba.

## Alcance
- `StepPhotos.clearPersistedPhotos()`: método nuevo que invoca `PhotoStorageService.clear()`.
- `Onboarding.nextStep()`: llama a `photos.clearPersistedPhotos()` al final del bloque de éxito, después
  del upload y del reorder. Si el upload falla, el `catch` no ejecuta la limpieza y las fotos pendientes
  se conservan para reintento.
- `OnboardingPersistenceService.clearAll()`: comentarios que documentan en qué storage vive cada clave
  (sin cambiar el comportamiento, que ya borraba ambos).
- Spec `onboarding-persistence.service.spec.ts`: cubre que `clearAll()` borra las claves de fotos en
  `localStorage`, limpia el progreso en `sessionStorage` y conserva claves ajenas al onboarding.

## Criterios de aceptación
- DADO un usuario que completa el onboarding subiendo fotos, CUANDO termina el envío del último paso,
  ENTONCES no quedan `arfinder_pending_photos` ni `arfinder_pending_photos_order` en `localStorage`.
- DADO un upload de fotos que falla, CUANDO `nextStep()` entra en el `catch`,  ENTONCES las fotos
  pendientes se conservan en `localStorage` para poder reintentar.
- DADO cualquier entrada de `localStorage` ajena al onboarding (p. ej. pwa/ auth), CUANDO se ejecuta
  `clearAll()`, ENTONCES esa entrada no se modifica.

## Checklist de verificación
- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run test:ci`

## Resultado
El onboarding terminado deja `localStorage` sin residuo de fotos pendientes, manteniendo intactas las
claves ajenas y sin perder fotos cuando el upload falla.

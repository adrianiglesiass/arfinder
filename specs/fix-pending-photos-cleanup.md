---
tag: SPECS/2026-09-fix-pending-photos-cleanup
estado: done
stack: frontend
fecha: 2026-09-10
---

# fix-pending-photos-cleanup

## Contexto
`PhotoStorageService` persiste fotos pendientes del onboarding en `localStorage`
(`arfinder_pending_photos`, `arfinder_pending_photos_order`). Su método `clear()` nunca se invoca.
`OnboardingPersistenceService.clearAll()` (llamado en logout, deleteAccount y al terminar onboarding)
solo limpia `sessionStorage` con las mismas claves.

## Problema
Fotos de un usuario A (o borradas con su cuenta) sobreviven en `localStorage` y pueden resubirse en
la cuenta B del mismo dispositivo.

## Alcance
- `OnboardingPersistenceService.clearAll()` debe borrar también las claves de fotos pendientes de `localStorage`.

## Criterios de aceptación
- DADO un usuario con fotos pendientes en `localStorage`, CUANDO hace logout o borra la cuenta,
  ENTONCES las fotos pendientes se eliminan de ambos storages.
- DADO un onboarding terminado, CUANDO se llama a `clearAll()`, ENTONCES no quedan fotos pendientes.

## Checklist de verificación
- [x] `npm run format:check`
- [x] `npm run lint`

## Resultado
`clearAll()` elimina también de `localStorage`.
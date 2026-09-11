---
tag: SPECS/2026-09-fix-photo-upload-refresh
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-photo-upload-refresh

## Contexto
- `ProfileService.addPhoto()` (`core/profile/profile.service.ts`) solo llama a la API: **no** actualiza
  `currentProfile`. En cambio `deletePhoto` y `reorderPhotos` sí lo hacen.
- `PhotosEditor` (`features/profile/edit/photos-editor`) pinta `orderedPhotos() ?? photos()`, donde
  `photos` viene de `currentProfile().photos`. Tras subir, `orderedPhotos.set(null)` hace que se pinte
  la lista antigua: aparece el toast "Fotos actualizadas", pero la foto no, el cálculo de huecos libres
  usa la lista vieja y el avatar tampoco cambia hasta recargar.

## Problema
Las fotos subidas desde `/perfil` no aparecen hasta recargar la página.

## Alcance
- `addPhoto` añade la foto devuelta a `currentProfile().photos` (ordenada por `order`) y actualiza la
  entrada del perfil en la caché `profilesById`, igual que hacen `deletePhoto` y `reorderPhotos`.

## No-goals
- NO se cambia el flujo de subida del onboarding, que usa sus propias fotos pendientes.

## Criterios de aceptación
- DADO `/perfil` con 2 fotos CUANDO se sube una ENTONCES se ven 3 sin recargar, y los huecos libres
  bajan en uno.

## Decisión técnica
- Actualizar el estado local con la respuesta del `POST`, en lugar de recargar el perfil: coincide con
  `deletePhoto` y `reorderPhotos` y ahorra una petición.

## Plan de tests
- `core/profile/profile.service.spec.ts` (nuevo): `addPhoto` añade la foto a `currentProfile` y a
  `profilesById`.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → BLOQUEADO** (un bloqueante y varios menores) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**. Todo lo bloqueante y lo menor se ha aplicado.

- `ProfileService.addPhoto` añade la foto a `currentProfile` ordenada por `order` y reutiliza
  `hydrateProfiles` para la caché por id (la revisión señaló que la primera versión duplicaba esa lógica).
- `core/profile/profile.service.spec.ts` (nuevo): la foto aparece en `currentProfile` y en la caché.

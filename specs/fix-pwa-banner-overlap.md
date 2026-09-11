---
tag: SPECS/2026-09-fix-pwa-banner-overlap
estado: approved
stack: frontend
fecha: 2026-09-11
---

# fix-pwa-banner-overlap

## Contexto
- `PwaBanner` (`shared/components/pwa-banner`), renderizado en `app.html`, muestra el aviso de
  instalar o de nueva versión con `fixed inset-x-4 bottom-24 z-40` en móvil.
- `MobileActionBar` (`shared/components/mobile-action-bar`) usa `fixed bottom-24 left-4 right-4 z-40`
  en móvil. Se usa en el detalle de perfil (corazón, "⋯" y "Mensaje") y en editar perfil ("Guardar").
- Mismo sitio y mismo z-index, y el banner va después en el DOM: cuando aparece, tapa la barra.
- Un `@media` en `styles.css` no serviría: la utilidad `bottom-24` vive en la capa `utilities`, que va
  después de `components` y gana.

## Problema
Cuando aparece el aviso de instalar o actualizar la app, el usuario no puede pulsar "Mensaje",
"Guardar" ni el resto de acciones de la barra móvil.

## Alcance
- `MobileActionBarState` (`core/layout/mobile-action-bar.state.ts`): signal con el número de barras
  de acción montadas.
- `MobileActionBar` se registra al crearse y se da de baja al destruirse.
- `PwaBanner`: en móvil, con una barra montada, se coloca por encima de ella (`bottom-40`); en
  escritorio no cambia.

## No-goals
- NO se cambia el contenido ni la lógica del banner.

## Criterios de aceptación
- DADO el detalle de perfil o la edición en móvil CUANDO aparece el banner ENTONCES queda encima de
  la barra de acciones y ambos se pueden pulsar.
- DADO una pantalla sin barra de acciones ENTONCES el banner mantiene su posición actual.

## Decisión técnica
- Un contador en lugar de un booleano: si alguna vez hay dos barras (o una se destruye después de
  que se cree la siguiente al navegar), el estado sigue siendo correcto.

## Plan de tests
- `core/layout/mobile-action-bar.state.spec.ts` (nuevo): registrar y dar de baja actualiza el signal.
- `shared/components/pwa-banner/pwa-banner.spec.ts` (nuevo): con una barra registrada, el banner usa
  la clase de desplazamiento.

## Checklist de verificación
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Frontend: `npm run build`

## Resultado

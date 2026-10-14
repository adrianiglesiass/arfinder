---
tag: SPECS/2026-10-fix-onboarding-double-submit
estado: approved
stack: frontend
fecha: 2026-10-15
---

# fix-onboarding-double-submit

## Contexto
En el último paso del onboarding (`features/onboarding/onboarding.ts`), `nextStep()` llama a
`saveOnboarding`, sube las fotos pendientes y las reordena. El botón "Ir a explorar" no se desactiva ni
muestra carga durante todo ese proceso, que con fotos tarda varios segundos.

## Problema
Un segundo toque mientras se guarda lanza otro `saveOnboarding` (que cae en el `PATCH` por
`PROFILE_ALREADY_EXISTS`) y otra subida de las mismas fotos: fotos duplicadas y toasts de error falsos.

## Alcance
- Signal `isSubmitting`: `nextStep()` ignora la llamada si ya hay un envío en curso.
- "Ir a explorar" muestra carga y se desactiva; "Anterior" y "Cancelar registro" se desactivan mientras
  se envía.
- Tras un error, el botón vuelve a estar disponible para reintentar.

## No-goals
- NO se cambia el orden guardar perfil → subir fotos → reordenar.

## Criterios de aceptación
- DADO el último paso CUANDO pulso "Ir a explorar" dos veces seguidas ENTONCES se guarda el perfil una
  sola vez.
- DADO un error al guardar ENTONCES se muestra el toast y puedo volver a pulsar.

## Decisión técnica
- Mismo patrón que `isExiting` en el mismo componente y que `isSaving` en editar perfil.

## Plan de tests
- `features/onboarding/onboarding.spec.ts` (nuevo): dos `nextStep()` en el último paso llaman una vez a
  `saveOnboarding`; tras un fallo `isSubmitting` vuelve a `false`.

## Checklist de verificación
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Build: `ng build --configuration production`

## Resultado
_Pendiente._

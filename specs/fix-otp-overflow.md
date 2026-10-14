---
tag: SPECS/2026-10-fix-otp-overflow
estado: approved
stack: frontend
fecha: 2026-10-15
---

# fix-otp-overflow

## Contexto
`features/auth/verify-email/verify-email.html` pinta seis inputs de `w-12` (48 px) con `gap-2`: 328 px
fijos. La tarjeta `AuthCard` tiene `p-6` fuera y `p-8` dentro, así que a 360 px de ancho solo quedan
248 px de contenido.

## Problema
A 360 px los seis dígitos desbordan la tarjeta en unos 80 px: los últimos quedan cortados o fuera de la
pantalla y hay scroll horizontal.

## Alcance
- Los inputs pasan a `flex-1 min-w-0 max-w-12` (crecen hasta 48 px y encogen si no caben), con un hueco
  y una altura algo menores en móvil.
- `AuthCard` reduce el padding interior en móvil (`p-6 sm:p-8 lg:p-10`).
- Cada dígito tiene `aria-label` ("Dígito n de 6") y el conjunto es un `role="group"` con nombre.

## No-goals
- NO se cambia la lógica de pegado, avance ni borrado entre dígitos.
- NO se añade `autocomplete="one-time-code"`: con `maxlength="1"` el autorrelleno de iOS escribiría el
  código entero en el primer dígito y habría que cambiar la lógica de entrada.

## Criterios de aceptación
- DADO un móvil de 360 px CUANDO abro "Verifica tu email" ENTONCES los seis dígitos caben en la tarjeta,
  sin scroll horizontal.
- DADO un escritorio ENTONCES los dígitos se ven igual que antes (48 px).

## Decisión técnica
- Solo clases de Tailwind; no hay medidas en JS. A 360 px cada dígito queda en ~40 px.

## Plan de tests
- Cambio de maquetación sin lógica: comprobación visual a 360 px y build. No se añade test unitario
  (jsdom no calcula layout).

## Checklist de verificación
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Build: `ng build --configuration production`

## Resultado
_Pendiente._

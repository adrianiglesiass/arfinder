---
tag: SPECS/2026-09-fix-onboarding-guard-overwrite
estado: done
stack: frontend
fecha: 2026-09-10
---

# fix-onboarding-guard-overwrite

## Contexto
`onboarding.guard.ts:17` devolvía `true` (permite entrar al wizard) si existía un formulario
persistido en `sessionStorage`, sin comprobar si el usuario ya tiene perfil.

## Problema
Un formulario stale (terminado el onboarding en otro dispositivo, o sesión antigua) reabre el wizard.
Al guardar, `createProfile` falla con `PROFILE_ALREADY_EXISTS` y `saveOnboarding` ejecuta
`updateProfile` sobrescribiendo el perfil real con datos viejos.

## Alcance
- Comprobar la existencia del perfil ANTES de permitir el wizard.
- Si el perfil ya existe: limpiar persistencia stale y redirigir a la home.

## Criterios de aceptación
- DADO un usuario con perfil existente y formulario stale, CUANDO navega a `/bienvenida`,
  ENTONCES se le redirige a `/` y no se entra al wizard.
- DADO un usuario sin perfil, CUANDO navega a `/bienvenida`, ENTONCES se entra al wizard
  (resumiendo el formulario persistido si existe).

## Checklist de verificación
- [x] `npm run format:check`
- [x] `npm run lint`

## Resultado
Guard reformado: perfil existente → redirección + cleanup.
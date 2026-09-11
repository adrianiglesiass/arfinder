---
tag: SPECS/2026-09-fix-toast-mobile-width
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-toast-mobile-width

## Contexto
- El tema Aura de PrimeNG da al toast `width: 25rem` (400px)
  (`@primeuix/themes/dist/aura/toast`), y la posición `top-right` lo coloca a 20px del borde derecho.
  No hay ningún override en `src/styles.css`.
- En un viewport de 360px el borde izquierdo del toast queda en -60px: el icono y el principio del
  texto no se ven.
- Hay tres `<p-toast position="top-right">`: `profile-detail.html` (feedback de bloquear y reportar,
  desde la PR #299), `profile-edit.html` y `onboarding.html`.
- `src/styles.css` declara `@layer theme, base, primeng, components, utilities;`.
- **Corrección hecha al implementar:** PrimeNG 21 aplica `top: 20px` y `right: 20px` como **estilo
  inline** en el host del toast (`primeng-toast.mjs`, `sx('root')`), así que una regla normal no bastaría:
  hace falta `!important`, que en la cascada gana a un estilo inline normal.

## Problema
En móvil los toasts salen cortados, justo cuando confirman acciones importantes como bloquear o
reportar.

## Alcance
- Regla global en `src/styles.css` (capa `components`): por debajo de 640px, el toast `top-right`
  ocupa el ancho disponible con 1rem de margen a cada lado.

## No-goals
- NO se cambia la posición ni el estilo del toast en escritorio.

## Criterios de aceptación
- DADO un viewport de 360px CUANDO aparece un toast ENTONCES cabe entero dentro de la pantalla, en
  los tres sitios donde se usa.
- DADO un viewport de escritorio ENTONCES el toast mantiene sus 25rem arriba a la derecha.

## Decisión técnica
- Una regla global en lugar de `[breakpoints]` en cada `<p-toast>`: arregla los tres usos a la vez y
  los que se añadan en el futuro.

## Plan de tests
- Sin test unitario (es CSS y el entorno de tests no calcula layout). Se comprueba que la regla
  compila en el bundle de producción y que el selector coincide con las clases que genera PrimeNG 21.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes, con las instrucciones de `.opencode/agent/code-reviewer.md` y `ui-ux-reviewer.md` → los dos **APROBADO CON CAMBIOS MENORES / OBSERVACIONES**, sin bloqueantes. Cambio aplicado tras ella: la regla estaba por error en la capa `base`;
se mueve a su propio bloque `@layer components`, como decía la intención.

- Regla `.p-toast.p-toast-top-right` con `left`/`right: 1rem` y `width: auto`, todo `!important`, por
  debajo de 640px. Verificado que sale en el CSS del bundle de producción. Según el ui-ux-reviewer, a
  360px el toast ocupa 328px y no choca con la barra de estado de iOS (`index.html` no usa
  `viewport-fit=cover`); entre 640 y 768px conserva sus 25rem.

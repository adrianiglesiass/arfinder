---
tag: SPECS/2026-09-fix-toast-mobile-width
estado: approved
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
- `src/styles.css` declara `@layer theme, base, primeng, components, utilities;`: una regla en
  `components` gana a la de PrimeNG sin `!important`.

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
- [ ] Frontend: `npm run format:check`
- [ ] Frontend: `npm run lint`
- [ ] Frontend: `npm run build`

## Resultado

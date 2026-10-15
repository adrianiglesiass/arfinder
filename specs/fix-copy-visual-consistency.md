---
tag: SPECS/2026-10-fix-copy-visual-consistency
estado: done
stack: frontend
fecha: 2026-10-15
---

# fix-copy-visual-consistency

## Contexto
Comparando las clases de las plantillas con el CSS que genera el build de producción, y repasando los
textos visibles:
- `CityAutocomplete`: `animate-in fade-in` (clases del plugin `tailwindcss-animate`, que no está
  instalado) → el aviso de error no se anima.
- `ProfileCard`: `text-decoration-none` no existe en Tailwind (`no-underline`).
- `Favorites` y `Blocked`: `hover:text-primary-light`, color que no existe en el tema → el enlace
  "Explorar perfiles" no cambia al pasar el ratón.
- `MessageBubble`: el doble check leído usa `text-[#5ac8fa]` fijo aunque el tema ya define
  `--color-chat-read` con ese valor.
- Mayúsculas de estilo inglés: "Verificar Email" y "Verificar Código"; el resto de la app usa mayúscula
  solo inicial.

## Problema
Clases que no hacen nada, un color fuera del tema y textos con mayúsculas incoherentes.

## Alcance
- `animate-fade-in`, `no-underline`, `hover:underline` en el enlace de los estados vacíos y
  `text-chat-read`.
- "Verifica tu email" y "Verificar código".

## No-goals
- NO se revisa el resto del sistema de color (p. ej. los verdes fijos del slider del onboarding en
  `styles.css`, que ya son estilos de capa de PrimeNG).

## Criterios de aceptación
- DADO el build de producción ENTONCES todas las clases de utilidad de las plantillas existen en el CSS
  generado.
- DADO la pantalla de verificación ENTONCES los textos usan mayúscula solo inicial.

## Decisión técnica
- Se usan los tokens del tema (`chat-read`) y las utilidades estándar de Tailwind v4; nada de CSS nuevo.

## Plan de tests
- Sin lógica: se comprueba con el build y con un script ad hoc que cruza las clases de las plantillas
  con el CSS generado.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Build: `ng build --configuration production`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → APROBADO CON CAMBIOS** (sin bloqueantes) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES** (sin bloqueantes). Sin cambios pedidos sobre este punto; el subtítulo
"correo electrónico" bajo "Verifica tu email" se deja como está.

- Tras el cambio, el script que cruza las clases de las plantillas con el CSS del build de producción no
  encuentra ninguna clase de utilidad inexistente.

Verificación final: `format:check`, `lint`, `test:ci` (**139 tests**, 23 archivos) y build de
producción.

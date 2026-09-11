---
tag: SPECS/2026-09-fix-blocked-page-mobile-access
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-blocked-page-mobile-access

## Contexto
- F4 (#295) quitó "Bloqueados" de `MobileNav` porque un quinto slot no cabía en 360px. La spec
  (`specs/feat-user-block.md`, Resultado, punto 5) afirma que "se mantiene en `sidebar-nav`,
  `navbar-links` y menú de usuario". **Es falso en dos de los tres sitios**:
  - `NavbarUserMenu` (`layout/navbar/navbar-user-menu/navbar-user-menu.ts`) solo tiene "Editar perfil"
    y "Cerrar sesión": nunca se añadió "Bloqueados".
  - `navbar-links` vive dentro de `<app-navbar>`, que **no se renderiza en ningún sitio**
    (`layout/layout.html` usa `SidebarNav` en escritorio y `MobileNav` en móvil).
- Resultado: `SidebarNav` (solo `md` en adelante) es el único acceso. En móvil, `/bloqueados` no es
  alcanzable desde la interfaz.
- `NavbarUserMenu` es el menú del avatar en `MobileNav`: un `p-menu` popup, así que añadir entradas no
  ocupa espacio en la barra.

## Problema
En móvil no hay forma de llegar a la lista de bloqueados, y por tanto de desbloquear a nadie.

## Alcance
- `NavbarUserMenu`: nueva entrada "Bloqueados" (`pi pi-ban`) que navega a `ROUTES.BLOCKED`, entre
  "Editar perfil" y el separador.
- Errata en `specs/feat-user-block.md`: nota al final del Resultado que corrige la afirmación del
  punto 5 y enlaza a esta spec. No se reescribe el texto original.

## No-goals
- NO se vuelve a añadir "Bloqueados" a `MobileNav`: la limitación de espacio de F4 sigue vigente.
- NO se elimina `<app-navbar>` / `navbar-links` aunque sea código muerto: se anota en `plan.md` como
  candidato de limpieza, fuera de este cambio.

## Criterios de aceptación
- DADO un usuario con sesión en móvil CUANDO pulsa su avatar en la barra inferior ENTONCES ve
  "Bloqueados" y, al pulsarlo, llega a `/bloqueados`.
- DADO un usuario con sesión en escritorio CUANDO usa la barra lateral ENTONCES "Bloqueados" sigue
  funcionando igual.

## Decisión técnica
- El menú del avatar es el sitio natural para una pantalla de ajustes de uso ocasional, y es el que
  F4 prometió. No compite por espacio con la navegación principal.

## Plan de tests
- Verificación manual en navegador a 360px (el menú es configuración estática de `p-menu`, sin
  lógica propia que testear en unitario).

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run build`
- [ ] Verificación visual en navegador (360px) — no realizada, ver Resultado

## Resultado
Implementado: `NavbarUserMenu` tiene la entrada "Bloqueados" (`pi pi-ban`) entre "Editar perfil" y
el separador, y navega a `ROUTES.BLOCKED`. Errata añadida al final de `specs/feat-user-block.md`.

No se verificó en navegador a 360px (se decidió no seguir usando Chrome). El cambio es una entrada
estática en el `model` de `p-menu`, el mismo mecanismo que ya renderiza "Editar perfil" y
"Cerrar sesión" en ese menú.

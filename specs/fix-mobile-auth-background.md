---
tag: SPECS/2026-11-fix-mobile-auth-background
estado: done
stack: frontend
fecha: 2026-11-18
---

# fix-mobile-auth-background

## Contexto
El fondo compartido de las pantallas publicas usa dos elementos circulares con
`filter: blur()` en [page-background.html](/home/proto/dev/arfinder/frontend/src/app/shared/components/page-background/page-background.html).
Login y registro se renderizan sobre este componente a traves de
[auth-card.html](/home/proto/dev/arfinder/frontend/src/app/features/auth/components/auth-card/auth-card.html).

## Problema
En dispositivos moviles las manchas pueden verse nítidas, recortadas o con bordes artificiales
en vez de fondos suaves y difuminados.

## Alcance
- Sustituir los elementos de fondo actuales por capas CSS responsivas sin bordes visibles.
- Mantener el aspecto existente en escritorio.
- Aplicar el fondo compartido correctamente en login, registro y verificacion.

## No-goals
- No cambiar el contenido ni el estilo de las tarjetas de autenticacion.
- No modificar el layout general del resto de pantallas publicas.

## Criterios de aceptacion
- DADO un viewport movil CUANDO se abre login o registro ENTONCES las manchas coloridas aparecen
  como degradados suaves, sin contornos circulares nitidos.
- DADO un viewport de escritorio CUANDO se abre una pantalla publica ENTONCES conserva el fondo
  blanco con manchas naranja y rosa difuminadas.
- DADO el componente compartido ENTONCES landing y autenticacion usan la misma implementacion
  sin estilos duplicados.

## Decision tecnica
El componente `PageBackground` sera responsable del fondo decorativo. Se usara
`radial-gradient()` como fondo del contenedor, con ajustes responsivos en utilidades existentes
de Tailwind o en una clase global del componente. Este mecanismo no depende del blur de filtros
CSS de composicion movil y evita bordes de filtros recortados.

## Plan de tests
- Prueba Vitest del componente: verifica que el contenedor conserva `relative`, `overflow-hidden`
  y una clase decorativa estable.
- Prueba de plantilla: verifica que no quedan elementos circulares con `blur-[100px]`.
- Verificacion visual opcional con navegador movil de login y registro.

## Checklist de verificacion
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Build: `npm run build`

## Resultado
Se reemplazaron los dos elementos circulares con `filter: blur()` por un fondo compartido basado
en `radial-gradient()`. La variante movil usa gradientes elipticos de mayor cobertura y evita
bordes recortados o nítidos. Landing, login, registro y verificacion heredan el mismo fondo.
El subtitulo principal se oscurecio de `text-gray-500` a `text-gray-600` para mejorar el contraste.

Verificacion final: 249 pruebas de 38 archivos; format, lint y build completados sin errores.

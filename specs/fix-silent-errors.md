---
tag: SPECS/2026-09-fix-silent-errors
estado: done
stack: frontend
fecha: 2026-09-11
---

# fix-silent-errors

## Contexto
Varios fallos se tragan y se muestran como si fueran un estado normal:
- `ProfileSearchService.loadPage` (`core/profile-search/profile-search.service.ts`): si falla una página
  que no es la primera, pone `hasMore=false`, y la cuadrícula muestra "Has visto todos los perfiles
  disponibles".
- `FavoritesService.refresh()` y `BlockService.refresh()` no capturan errores: `/favoritos` y
  `/bloqueados` muestran "Aún no tienes favoritos" / "No has bloqueado a nadie" y queda una promesa
  rechazada sin tratar.
- `ConversationStore.refresh()` (`core/conversations/conversation.store.ts`) tiene un `catch {}` vacío:
  la lista de conversaciones sale vacía sin avisar.
- `Messages.selectConversation()` (`features/messages/messages.ts`) tiene un `catch {}`: si falla la carga
  de una conversación, el chat queda vacío sin avisar.
- `ProfileEdit.ngOnInit()` (`features/profile/edit/profile-edit.ts`): con un error que no es 404 y sin
  perfil en caché, `isLoading` nunca pasa a `false` y el esqueleto se queda para siempre.

## Problema
Un fallo de red se ve como "no hay nada" o como una carga infinita, sin forma de reintentar.

## Alcance
- Búsqueda: signal `loadMoreError`; la cuadrícula muestra "No se pudieron cargar más perfiles" con
  "Reintentar" en lugar del mensaje de fin.
- Favoritos y bloqueados: signal `error` en cada servicio (con `catch`), y las páginas muestran un estado
  de error con "Reintentar" en vez del vacío.
- Conversaciones: signal `error` en el store y aviso con "Reintentar" en la lista.
- Mensajes: estado de error en el chat cuando falla la carga de una conversación.
- Editar perfil: estado de error con "Reintentar" en lugar del esqueleto infinito.
- Se reutiliza `EmptyState` (`shared/components/empty-state`), que ya usa la búsqueda para su error.

## No-goals
- NO se añade un sistema global de errores.

## Criterios de aceptación
- DADO un fallo al cargar más perfiles ENTONCES se ve el aviso con "Reintentar" y no el mensaje de fin.
- DADO un fallo al cargar favoritos, bloqueados o conversaciones ENTONCES se ve el error y no el estado
  vacío; "Reintentar" vuelve a cargar.
- DADO un fallo que no es 404 al cargar el perfil en edición ENTONCES se ve el error, no el esqueleto.

## Decisión técnica
- Un signal de error por servicio y el mismo `EmptyState` que ya usa la búsqueda: consistencia visual sin
  componentes nuevos.

## Plan de tests
- Specs de servicio: `refresh()` fallido pone `error` y no rechaza; un `loadMore` fallido pone
  `loadMoreError` y deja `hasMore` intacto.

## Checklist de verificación
- [x] Frontend: `npm run format:check`
- [x] Frontend: `npm run lint`
- [x] Frontend: `npm run test:ci`
- [x] Frontend: `npm run build`

## Resultado
Revisión (SDD fase 6): dos agentes. **code-reviewer → BLOQUEADO** (un bloqueante y varios menores) y **ui-ux-reviewer → APROBADO CON OBSERVACIONES**. Todo lo bloqueante y lo menor se ha aplicado. Cambios aplicados tras ella:
- el aviso del deck ocupa el mismo hueco fijo que el contador `n / total`, así que la carta no cambia de
  tamaño; el botón es `secondary` con icono, igual que en la cuadrícula;
- `EmptyState` acepta `alert` y los estados de error lo usan (`role="alert"`, para lectores de pantalla);
- el error de editar perfil solo se muestra si **no** hay perfil (antes podía taparlo cuando
  `ensureProfile` respondía después) y va dentro del mismo contenedor con márgenes que el esqueleto;
- textos unificados en "No pudimos…".

- Signals `loadMoreError` (búsqueda), `error` (favoritos, bloqueados y conversaciones), `chatError` y
  `sendError` (mensajes) y `loadError` (editar perfil), con "Reintentar" en cada caso.
- `conversation.store.spec.ts` (nuevo) y tests de servicio para cada `refresh` fallido.
- Frontend: **102 tests** (16 archivos), lint, formato y build.

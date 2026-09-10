# Metodología SDD — Specification-Driven Development

> Documento de referencia para TODO el trabajo en Arfinder. Ningún fix o feature nuevo
> puede tocar código sin pasar antes por la fase de **Especificación** descrita aquí.
> Este documento es la norma vinculante para los subagentes definidos en [`AGENTS.md`](../AGENTS.md).

---

## 1. ¿Qué es SDD y por qué?

**SDD (Specification-Driven Development)** es una disciplina en la que *todo cambio sobre el
sistema se describe y aprueba antes de escribir código*. El código no es la fuente de verdad:
la **especificación** lo es.

Un cambio sin spec es una *suposición disfrazada de tarea*. Con SDD aseguramos:

- **Claridad**: problema, alcance y aceptación quedan por escrito antes de invertir en código.
- **Responsabilidad única**: cada cambio resuelve UNA cosa y toca el menor número de módulos posible.
- **Reutilización**: se diseña sobre lo que ya existe (servicios, repos, componentes `shared/`, helpers)
  en lugar de duplicar.
- **Verificabilidad**: los criterios de aceptación se convierten en tests. *Done* no se declara, se demuestra.
- **Traza**: `specs/` guarda el historial de decisiones ("por qué" de cada cambio).

> Regla de oro: **no existe tarea sin spec**. Si una petición llega sin spec, la primera
> tarea es escribir la spec (el comando `/spec` la genera).

---

## 2. Ciclo de vida de un cambio

Cada fix o feature sigue EXACTAMENTE estas fases, en orden:

```
1. ESPECIFICAR → 2. DISEÑAR → 3. PLANIFICAR → 4. IMPLEMENTAR → 5. VERIFICAR → 6. REVISAR → 7. CERRAR
```

### Fase 1 — Especificar
- Crear `specs/<slug>.md` con la plantilla de la Sección 3 (comando `/spec`).
- Responder PUNTO POR PUNTO: contexto, problema, alcance, no-goals y criterios de aceptación.
- Estado: `draft`.

### Fase 2 — Diseñar
- Leer la arquitectura y convenciones existentes:
  - [`../docs/architecture/backend.md`](../docs/architecture/backend.md)
  - [`../docs/architecture/frontend.md`](../docs/architecture/frontend.md)
  - [`../docs/database/modelo-relacional-info.md`](../docs/database/modelo-relacional-info.md)
- Identificar las capas/archivos afectados y la **reutilización** de lo ya existente.
- Registrar la decisión técnica en la spec (sección *Decisión técnica*).
- Estado: `approved` (tras revisar que el diseño cumple convenciones).

### Fase 3 — Planificar
- Desglosar la implementación en tareas pequeñas y verificables (tool de tareas / todo list).
- Cada tarea debe tener una comprobación concreta (un test, un lint, un tipo que compila).

### Fase 4 — Implementar
- Escribir código siguiendo las convenciones de la Sección 4 y 5 (stack correspondiente).
- **Single Responsibility**: un archivo = una responsabilidad; commits pequeños y con sentido.

### Fase 5 — Verificar
- Ejecutar la verificación completa del stack afectado (Sección 6).
- El *Done* de la fase 5 está definido en la Sección 7 — **no se puede saltar**.

### Fase 6 — Revisar
- Delegar la revisión a los subagentes:
  - `code-reviewer`: cumplimiento de spec + convenciones + SOLID + reutilización.
  - `ui-ux-reviewer`: si el cambio toca interfaz o preferencias de usuario.
- Corregir lo que indiquen y re-verificar.

### Fase 7 — Cerrar
- Actualizar la spec a estado `done` con el resultado de la verificación.
- Si el cambio modifica el contrato de la API, regenerar los tipos del frontend
  (`npm run generate:types`) y actualizar `docs/` si aplica.

---

## 3. Plantilla de especificación

Toda spec vive en `specs/<slug>.md`. `slug` es una palabra o dos separadas por guiones
(ej. `specs/chat-read-receipts.md`, `specs/fix-city-autocomplete.md`).

```markdown
---
tag: SPECS/YYYY-MM-<slug>
estado: draft            # draft | approved | in-progress | done | cancelled
stack: ""                # backend | frontend | ambos
fecha: YYYY-MM-DD
---

# <slug>

## Contexto
<qué existe hoy que motiva este cambio; enlazar docs/archivos relevantes>

## Problema
<qué dolor concreto resuelve; máximo 3 frases. Nada de design-sabores>

## Alcance
<qué SÍ va a hacer este cambio, en viñetas>

## No-goals
<qué NO va a hacer; límites explícitos para evitar scope creep>

## Criterios de aceptación
- DADO <contexto> CUANDO <acción> ENTONCES <resultado observable>
- DADO <estado inicial> CUANDO <usuario hace X> ENTONCES <resultado>
  Y <otra consecuencia>

## Decisión técnica
<arquitectura a usar, capas/archivos afectados, reutilización de lo existente,
 alternativas descartadas y por qué>

## Plan de tests
<unitarios, de integración, de UI; framework y localización de cada uno>

## Checklist de verificación
- [ ] Backend: `ruff check .` y `ruff format --check .`
- [ ] Backend: `pytest --tb=short`
- [ ] Frontend: `npm run format:check` y `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Build: `ng build` (o `chinita` equivalente) — solo si aplica

## Resultado
<al cerrar: qué pasó, diffs de comportamiento, enlaces a commits>
```

---

## 4. Convenciones backend (Stack FastAPI)

Arquitectura **por capas** (ver `docs/architecture/backend.md`). El flujo es siempre:

```
Router → (deps auth/rate-limit/db) → Service → Repository → Model/DB → Schema
```

### Responsabilidad única por capa
| Capa | Responsabilidad | Regla |
|---|---|---|
| `app/routes/*.py` | HTTP + enrutado + validación básica | Muy delgados; delegan en servicios |
| `app/services/*_service.py` | Lógica de negocio y orquestación | Funciones planas; `db: Session` primer argumento |
| `app/repositories/*_repository.py` | Acceso a datos SQLAlchemy | Hacen `commit()`+`refresh()` internos (nunca los servicios) |
| `app/schemas/*.py` | Contratos Pydantic v2 | Inputs `ConfigDict(extra="forbid")`, outputs `from_attributes=True` |
| `app/models/*.py` | Modelos ORM | `Base` de `app.db.database`; `func.now()`; enums como en `profile.py` |
| `app/core/` | Config, seguridad, rate-limit, realtime, excepciones | Infra transversal reutilizable |
| `app/clients/` | Integraciones externas (Cloudinary…) | Solo IO externa |

### Reglas de estilo
- **Imports siempre absolutos**: `from app.<paquete>.<modulo> import X`.
- **Excepciones de dominio** en `app/core/exceptions/` heredando de `AppError`; el `code`
  se deriva del nombre de clase (SNAKE_CASE). Nunca devolver 200 con error dentro del body.
- **Mensajes y `detail` en español** para los usuarios finales.
- Nombrado: `XxxCreate`, `XxxUpdate`, `XxxResponse`, `XxxSummary`; funciones de repo
  `get_*_by_*`, `create_*`, `update_*`, `delete_*`, `search_*`; funciones de servicio
  verbos de negocio (`send_message_to_user`, `mark_conversation_messages_as_read`).
- Helpers privados con `_` prefijo; constantes UPPER_SNAKE de módulo.
- Async para IO externa (Cloudinary, Nominatim, InsForge); DB síncrona delegada a
  `run_in_threadpool` / `asyncio.to_thread`.
- Migraciones con **Alembic** (`make migrate`); revisar que el modelo ORM y la migración van a la par.
- Reutilizar dicts de respuestas de `app/core/openapi.py` (`UNAUTH`, `NOT_FOUND`, …).

---

## 5. Convenciones frontend (Stack Angular)

Arquitectura **modular por features** (ver `docs/architecture/frontend.md`):
`core/` (servicios, stores, guards) · `infrastructure/` (HTTP API) · `features/` (pantallas)
· `shared/` (reutilizables) · `layout/` (shell).

### Reglas de estilo (no negociables)
- **Angular 21 zoneless + standalone**: componentes `standalone`, sin `NgModules`, sin `Zone.js`.
- **Signals en TODO**: `signal()`, `computed()`, `effect()`, `input()`, `output()`, `model()`,
  `viewChild()`. Prohibidos `@Input()`, `@Output()`, `@ViewChild()` en código nuevo.
- `changeDetection: ChangeDetectionStrategy.OnPush` en componentes de UI.
- Guards (`CanActivateFn`) e interceptores (`HttpInterceptorFn`) **funcionales**.
- Componentes **sin sufijo `Component`**; selector `app-`; templates en `.html` separado.
- `inject()` en vez de inyección por constructor.
- Tipos de API **auto-generados** (`openapi-typescript` → `core/api/api.types.ts`); editar
  `api.types.ts` a mano está prohibido si el backend puede regenerarla.
- **Reutilización primera**: antes de crear un componente nuevo, revisar `shared/components/`
  (button, avatar, skeleton, empty-state, city-autocomplete, profile-form…).
- Estado global con stores basados en signals a mano (patrón `conversation.store.ts`,
  `profile.service.ts`); no introducir NgRx/NgXS salvo decisión en spec.
- Servicios HTTP en `infrastructure/` devuelven `Promise<T>` vía `firstValueFrom()`.
- UX/UI en **español**, rutas en español (`/explorar`, `/mensajes`, `/perfil`…).
- Estilos: Tailwind CSS v4 + PrimeNG; variables en `src/styles.css`; no CSS suelto sin capa.

---

## 6. Comandos de verificación

> Ejecutar SIEMPRE la verificación del/los stack afectados antes de dar cualquier cambio por hecho.

### Backend (desde `backend/`)
```bash
make lint          # ruff check .
make format-check  # ruff format --check .
make test          # pytest --tb=short
make migrate       # alembic upgrade head (si hay migraciones)
```

### Frontend (desde `frontend/`)
```bash
npm run format:check
npm run lint
npm run test:ci    # Vitest, single run
npm run build      # o `npx ng build --configuration production`
```

### Referencia CI
- Backend: `.github/workflows/ci.yml` (ruff check, ruff format --check, alembic upgrade, pytest).
- Frontend: `.github/workflows/frontend-ci.yml` (format:check, lint, build).

---

## 7. Definición de *Done*

Un cambio NO está terminado hasta que:

1. Su spec está `approved` y las tareas planificadas completadas.
2. Backend: `ruff check .`, `ruff format --check .` y `pytest --tb=short` pasan.
3. Frontend: `npm run format:check`, `npm run lint` y `npm run test:ci` pasan (y build si aplica).
4. Si cambió el contrato de la API → `api.types.ts` regenerado y sincronizado.
5. Pasó la revisión de `code-reviewer` (y `ui-ux-reviewer` si toca UI/UX) sin objeciones bloqueantes.
6. La spec se actualizó a `done` con el resultado.

Contribuciones sin spec o que ignoren estas convenciones deben **rechazarse** en review,
no arreglarse *a medias*.
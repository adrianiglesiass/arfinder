# AGENTS.md — Arfinder

Guía de trabajo para agentes de IA en este repositorio. **Léela antes de tocar cualquier cosa.**

> **Punto de partida para agentes:** [`specs/plan.md`](specs/plan.md) contiene la hoja de ruta
> completa (fases, backlog y estado de ramas) para retomar el trabajo sin agotar contexto.

---

## Norma vinculante: SDD

Todo fix o feature sigue la metodología **Specification-Driven Development** descrita en
[`specs/spec-driven-development.md`](specs/spec-driven-development.md). Resumen obligatorio:

1. **No escribir código sin spec** previa en `specs/<slug>.md` (estado `draft` → `approved`).
2. Seguir las **convenciones** de ese documento (single responsibility, reutilización, stacks).
3. **Verificar** siempre con los comandos de la Sección 6 de la spec.
4. **Un cambio no está Done** hasta cumplir la Definición de *Done* (Sección 7 del spec).

El comando `/spec` genera la plantilla para arrancar el flujo.

---

## Stack y arquitectura

| Área | Tecnología | Documento |
|---|---|---|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.0 · PostgreSQL 15 · Pydantic v2 · Alembic · pytest · Ruff | `docs/architecture/backend.md` |
| Frontend | Angular 21 (zoneless, standalone) · Signals · TypeScript · PrimeNG · Tailwind v4 · Vitest · ESLint/Prettier | `docs/architecture/frontend.md` |
| Datos | Modelo relacional | `docs/database/modelo-relacional-info.md` |
| CI/CD | GitHub Actions (`.github/workflows/`) · Fly.io (backend) · InsForge (frontend/auth) | — |

Ubicación del código: `backend/app/` y `frontend/src/app/`. Es un monorepo con CI separado por stack.

---

## Subagentes disponibles

| Agente | Uso | Permisos |
|---|---|---|
| `backend` | Implementar/arreglar lógica FastAPI, servicios, repos, schemas, modelos, migraciones | Edita y ejecuta |
| `frontend` | Implementar/arreglar componentes Angular, stores, guards, interceptores, estilos | Edita y ejecuta |
| `ui-ux-reviewer` | Auditar UX/UI en español, consistencia visual, responsive, accesibilidad | Solo lectura |
| `code-reviewer` | Examinar código contra la spec + convenciones + SOLID + reutilización | Solo lectura |

### Cuándo delegar
- **`backend`**: cualquier cambio que toque rutas, servicios, repos, modelos, schemas, migraciones o integraciones externas.
- **`frontend`**: cualquier cambio en componentes, stores, guards, interceptores, estilos o PWA.
- **`ui-ux-reviewer`**: SIEMPRE que un cambio modifique interfaz, flujos de usuario, mensajes/feedback o preferencias de UX.
- **`code-reviewer`**: SIEMPRE antes de dar cualquier cambio por terminado (fase 6 del ciclo SDD).

---

## Reglas transversales

- **Idioma**: documentos (`specs/`, `docs/`) y textos de UI en **español**; identificadores de
  código, **mensajes de commit y títulos de PR en inglés**. El historial de `main` está en inglés
  desde el inicio: no lo mezcles.
- **Responsabilidad única**: un archivo = una responsabilidad; cambios pequeños y con sentido.
- **Reutilización primero**: revisar `backend/app/core/` y `frontend/src/app/shared/` antes de crear duplicados.
- **Tipos autogenerados**: si cambia el contrato de la API, regenerar `frontend/src/app/core/api/api.types.ts` con `npm run generate:types` (nunca editar a mano).
- **No romper CI**: los workflows de CI verifican lo mismo que la Sección 6 de la spec de SDD.

## Verificación rápida

```bash
# Backend (desde backend/)
make lint && make format-check && make test

# Frontend (desde frontend/)
npm run format:check && npm run lint && npm run test:ci
```
---
description: Arranca el flujo SDD generando la plantilla de especificación para un nuevo fix o feature.
agent: build
---

Eres un agente que arranca el ciclo **Specification-Driven Development** de Arfinder.
Estás en la Fase 1 (Especificar) de `specs/spec-driven-development.md`.

Petición del usuario: **$ARGUMENTS**

## Tareas

1. Lee `specs/spec-driven-development.md` (sobre todo la plantilla de la Sección 3) y
   `AGENTS.md` para conocer las convenciones del proyecto.
2. Inventa un `slug` corto y descriptivo para la petición (2-4 palabras separadas por guiones).
   Verifica que no exista ya `specs/<slug>.md`; si existe, reutiliza esa spec como borrador y
   propón cómo se integra con lo pedido.
3. Crea `specs/<slug>.md` con el frontmatter de la plantilla:
   - `estado: draft`
   - `stack`: decide si es backend / frontend / ambos (según lo que toque la petición).
   - `fecha`: fecha de hoy.
4. Investiga el contexto necesario ANTES de rellenar las secciones:
   - Endpoints y servicios existentes en `backend/app/routes`, `backend/app/services` (si aplica backend).
   - Funcionalidades equivalentes en `backend/app/repositories`, `backend/app/schemas`.
   - Componentes/servicios/stores en `frontend/src/app/core`, `features`, `shared` (si aplica frontend).
   - Reglas de negocio relevantes en `docs/architecture/*.md` y `docs/database/modelo-relacional-info.md`.
   NO rellenes secciones inventando arquitectura: cita archivos reales que existan.
5. Rellena las secciones: Contexto, Problema, Alcance, No-goals, Criterios de aceptación
   (formato Given/When/Then), Decisión técnica (con las capas/archivos afectados y la
   reutilización de lo existente), Plan de tests, Checklist de verificación y Resultado (vacío).
6. Devuelve un resumen al usuario: ruta de la spec creada, stack implicado, capas/archivos
   que se tocarían, y los próximos pasos (fase 2 Diseñar → pide aprobación del usuario).

Regla dura: NO edites código de la aplicación. Solo crea o actualiza `specs/`.
---
tag: SPECS/2026-09-fix-profile-schema-validation
estado: done
stack: ambos
fecha: 2026-09-11
---

# fix-profile-schema-validation

## Contexto
- `app/schemas/profile.py` (`ProfileCreate` y `ProfileUpdate`) limita `name` y `city` a
  `max_length=150`, pero las columnas de `app/models/profile.py` son `String(100)`. Del resto de campos
  con límite, `gender` (50) coincide y `bio`/`room_description` son `Text`.
- En `ProfileUpdate` todos los campos son `Optional[...] = None`. `profile_repository.update_profile`
  aplica `data.model_dump(exclude_unset=True)` con `setattr`, y `exclude_unset` **incluye** los `null`
  enviados explícitamente.
- Seis columnas son `nullable=False`: `name`, `age`, `city`, `has_pets`, `is_smoker` y `type`.

## Problema
Un nombre o una ciudad de 101 a 150 caracteres, o un `PATCH /profiles/me` con `null` en uno de esos
seis campos, provocan un error de la BD y un 500, en lugar de un 422 con un mensaje claro.

## Alcance
- `name` y `city`: `max_length=100` en `ProfileCreate` y `ProfileUpdate`.
- `ProfileUpdate`: un validador rechaza `null` explícito en los seis campos no nulos. Omitirlos sigue
  significando "no cambiar".

## No-goals
- NO se cambian las columnas de la BD ni se añade una migración.
- NO se cambian los mensajes de validación existentes.

## Criterios de aceptación
- DADO `POST /profiles/me` con un `name` de 101 caracteres ENTONCES responde 422, no 500.
- DADO `PATCH /profiles/me` con `{"name": null}` (o `age`, `city`, `has_pets`, `is_smoker`, `type`)
  ENTONCES responde 422 y el perfil no cambia.
- DADO `PATCH /profiles/me` con `{"bio": null}` ENTONCES se borra la bio como hasta ahora.
- DADO `PATCH /profiles/me` sin esos campos ENTONCES no se tocan.

## Decisión técnica
- Alinear el schema con la columna, y no al revés: no hay datos que justifiquen ampliar la columna y
  evita una migración. (Corrección tras la revisión: el frontend **no** limita estos campos, no hay
  ningún `maxlength` en los formularios. Con este cambio el usuario recibe un 422 con mensaje en vez de
  un 500; añadir `maxlength="100"` en los inputs queda para `fix/ux-a11y`, #49.)

## Plan de tests
- `tests/profiles/test_profile_validation.py` (nuevo): 101 caracteres en `name` y `city` dan 422 en
  create y update; `null` en cada uno de los seis campos da 422; `null` en `bio` se acepta.

## Checklist de verificación
- [x] Backend: `ruff check .`
- [x] Backend: `ruff format --check .`
- [x] Backend: `pytest`

## Resultado
Revisión (SDD fase 6): agente con las instrucciones de `.opencode/agent/code-reviewer.md` → **APROBADO CON CAMBIOS MENORES**, sin bloqueantes. Cambio de enfoque aplicado tras ella: en vez de
un validador que rechaza `null`, los seis campos se declaran **no opcionales con valor por defecto**
(`name: str = Field(None, max_length=100)`, `has_pets: bool = None`, etc.). Pydantic no valida el valor
por defecto, así que omitir el campo sigue significando "no cambiar", y un `null` explícito falla por
tipo. La ventaja es que el contrato OpenAPI, y por tanto `api.types.ts`, deja de decir que esos campos
admiten `null`.

- `name` y `city` a `max_length=100` en `ProfileCreate` y `ProfileUpdate`.
- `frontend/src/app/core/api/api.types.ts` regenerado: los seis campos de `ProfileUpdate` pierden
  `| null`. El frontend compila sin cambios, porque ya no enviaba `null` en ellos (lo confirmó la revisión
  en `profile-edit.ts`).
- `tests/profiles/test_profile_validation.py` (nuevo): 14 tests. **Contra el schema anterior fallan
  exactamente los 10 que apuntan a los bugs** (4 de longitud y 6 de `null`).

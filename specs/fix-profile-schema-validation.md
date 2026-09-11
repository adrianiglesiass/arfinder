---
tag: SPECS/2026-09-fix-profile-schema-validation
estado: approved
stack: backend
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
  evita una migración. El frontend no permite más de 100 en esos campos.

## Plan de tests
- `tests/profiles/test_profile_validation.py` (nuevo): 101 caracteres en `name` y `city` dan 422 en
  create y update; `null` en cada uno de los seis campos da 422; `null` en `bio` se acepta.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest`

## Resultado

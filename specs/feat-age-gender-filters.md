---
tag: SPECS/2026-09-feat-age-gender-filters
estado: done
stack: frontend
fecha: 2026-09-10
---

# feat-age-gender-filters

## Contexto
- La búsqueda de perfiles se hace en `/explorar` (`features/search-profile/`) con un panel de filtros
  (`components/search-filters/`) que hoy ofrece: ciudad, tipo, horario, presupuesto, mascotas y fumador.
- El **backend ya soporta** los filtros de edad y género: `GET /profiles` acepta `gender`, `age_min` y
  `age_max` (`app/routes/profile.py` → `profile_service.search_profiles` → `profile_repository.search_profiles`).
- El **estado y URL ya están cableados**: `ProfileSearchService` lee/escribe `gender`, `age_min`, `age_max`
  desde/para los query params, y `search-profile.ts` ya dibuja los chips activos (`gender`, `age_range`)
  y los remueve (`removeFilter`). `api.models.ts` → `ProfileSearchFilters` (OpenAPI) ya incluye esos campos.
- Lo que **falta**: los controles de UI de edad y género en el panel de filtros. El `.ts` ya tiene
  `readonly ageMin`, `ageMax`, `setAgeMin`, `setAgeMax` SIN usar, y ningún setter de género.

## Problema
El usuario no puede filtrar explorar por edad ni por género desde la interfaz, aunque toda la cadena
de datos (backend, estado, URL, chips activos) ya lo soporta.

## Alcance
- Añadir al panel de filtros (`search-filters.html` + `search-filters.ts`):
  - Rango de **edad** (mín + máx) con `p-inputnumber` de PrimeNG (ya importado).
  - Chip de **género** reutilizando `app-filter-chip-group` (shared): Mujer / Hombre / Prefiero no decirlo,
    deseleccionable (permitir "cualquiera").
- Conectar los nuevos controles a `ProfileSearchService.updateFilter('age_min'|'age_max'|'gender', …)`.
- Especificar constante de límites de edad (18–99).
- Test de componente que cubra selección de género y entrada de edad.

## No-goals
- NO tocar backend (filtros ya implementados y validados).
- NO regenerar `api.types.ts` (el contrato no cambia; `ProfileSearchFilters` ya incluye los campos).
- NO cambiar el servicio de búsqueda, la URL, los chips activos ni `removeFilter` (ya funcionan).
- NO tocar otras pantallas ni el formulario de perfil.

## Criterios de aceptación
- DADO un usuarix en `/explorar` con los filtros abiertos CUANDO selecciona "Mujer" en Género
  ENTONCES `filters().gender === 'Mujer'`, la URL gana `gender=Mujer` y la búsqueda se refresca.
- DADO el mismo panel CUANDO vuelve a pulsar "Mujer" (deseleccionar) ENTONCES `filters().gender` se elimina.
- DADO el panel CUANDO introduce edad mínima (p.ej. 25) y/o máxima (p.ej. 35) ENTONCES
  `filters().age_min`/`age_max` se actualizan y aparecen en la URL.
- DADO el panel CUANDO el usuario borra un campo de edad ENTONCES el filtro correspondiente desaparece
  de los filtros y de la URL.
- DADO el componente en un test con `ProfileSearchService` mockeado CUANDO se disparan los eventos
  de edad/género ENTONCES `updateFilter` se llama con los pares (`'gender'`, valor) y (`'age_min'|'age_max'`, valor).

## Decisión técnica
- **Reutilización**: `app-filter-chip-group` (ya usado para tipo/horario/mascotas/fumador) para el género;
  `p-inputnumber` (ya importado en el componente) para la edad. Mismo patrón de binding que el resto:
  `[ngModel]="computado()"` + `(ngModelChange)="setX($event)"`.
- El género se modela como string libre (`gender: Optional[str]` en el schema; el formulario de perfil usa
  exactamente "Mujer"/"Hombre"/"Prefiero no decirlo"), así que el chip emite el string y el backend hace
  match con `ilike`. Constante `GENDER_OPTIONS: FilterChipOption<string>[]` en el componente.
- Constantes de edad: `AGE_MIN_LIMIT = 18`, `AGE_MAX_LIMIT = 99` como límites de los `p-inputnumber`
  (el backend no valida rangos → la UI acota para evitar consultas absurdas).
- **Sin cambios fuera de `search-filters.ts/html`** más un nuevo spec de test. `setAgeMin`/`setAgeMax`
  ya existentes reciben `number | null` (PrimeNG emite `null` al vaciar) — se reutilizan tal cual.

## Plan de tests
`frontend/src/app/features/search-profile/components/search-filters/search-filters.spec.ts`
(patrón de `features/messages/messages.spec.ts`, con services mockeados):
- `ProfileSearchService` mockeado con `filters`, `updateFilter`, `reset`.
- `CitySearchService` mockeado (autocompletado).
- Selector `'.spec'` normal.
- Casos:
  - seleccionar una opción de género llama a `updateFilter('gender', 'Mujer')`.
  - deseleccionar el mismo chip llama a `updateFilter('gender', null)`.
  - cambiar edad mínima llama a `updateFilter('age_min', 25)`.
  - cambiar edad máxima llama a `updateFilter('age_max', 35)`.

## Checklist de verificación
- [ ] Frontend: `npm run format:check` y `npm run lint`
- [ ] Frontend: `npm run test:ci`
- [ ] Build: `npx ng build --configuration production`

## Resultado
- `search-filters.html`: nueva sección "Edad" (Mín/Máx con `p-inputnumber`, límites 18–99) y chip group "Género"
  (Mujer/Hombre/Prefiero no decirlo, deseleccionable) reutilizando `app-filter-chip-group`.
- `search-filters.ts`: `GENDER_OPTIONS`, `gender` computed, `setGender`, límites de edad; se reutilizaron
  `setAgeMin`/`setAgeMax`/`ageMin`/`ageMax` como estaban. Se añadió `changeDetection: OnPush` (recomendación del reviewer).
- Sin cambios en backend, `api.types.ts`, `ProfileSearchService` ni chips activos: toda la cadena ya soportaba el filtro.
- Test de componente `search-filters.spec.ts`: 4 casos (seleccionar/deseleccionar género, edad min/max, límites UI).
- Revisión `code-reviewer` (read-only): **apruebo con comentarios**; sin bloqueantes; comentario 1 (OnPush) aplicado.
- Verificación: `format:check` ✓, `lint` ✓, `test:ci` → **3 files / 15 passed**, build producción ✓.
- PR: `feat/age-gender-filters` → develop.
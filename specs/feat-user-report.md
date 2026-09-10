---
tag: SPECS/2026-09-feat-user-report
estado: done
stack: ambos
fecha: 2026-09-10
---

# feat-user-report

## Contexto
- Última fase del backlog de `specs/plan.md` (F5). Greenfield: no hay modelo, endpoint ni UI de
  reportes o moderación en el repo.
- F4 (`specs/feat-user-block.md`, PR #295) dejó el terreno preparado y es lo que se reutiliza:
  `app/services/block_service.block_profile` ya valida el perfil destino (404), impide el
  auto-bloqueo (400 `CANNOT_BLOCK_SELF`) y traduce `profile_id` a `user_id` vía
  `profile_service.get_public_profile`.
- Patrones establecidos por `app/models/block.py` y `app/models/favorite.py`: `UniqueConstraint`
  sobre el par de usuarios, índices por cada FK, `ondelete="CASCADE"`, `created_at` con
  `server_default=func.now()`, relaciones `back_populates` declaradas en `app/models/user.py` y
  export en `app/models/__init__.py`.
- Errores de dominio: `AppError` por dominio en `app/core/exceptions/`, con `code` explícito
  (lección de F4, donde el código derivado del nombre de clase no coincidía con el contrato).
- Enums de negocio: `str, Enum` como `ScheduleEnum` y `TypeEnum` en `app/schemas/profile.py`.
- Frontend: existe `@shared/components/confirm-destructive-dialog` como patrón de diálogo modal
  propio (overlay, `role="dialog"`, `aria-modal`, `Button` compartido). El proyecto no usa
  `p-dialog` de PrimeNG para este tipo de confirmación.
- El detalle de perfil (`features/profile/profile-detail.*`) ya aloja el `BlockButton`, con el
  guard `showBlockButton()` que exige sesión iniciada.

## Problema
Bloquear oculta a alguien, pero no deja constancia de por qué. Hoy no hay ninguna vía para que un
usuario avise de una conducta abusiva ni para que quede registrada. F5 añade el reporte con motivo,
que además bloquea al reportado para que el efecto sea inmediato.

## Alcance
- **Backend**
  - `app/models/report.py`: `UserReport` (tabla `user_report`) con `reporter_user_id`,
    `reported_user_id`, `reason`, `detail` y `created_at`; `UniqueConstraint`
    `uq_user_report_reporter_target`, índices por ambas FK y `ondelete="CASCADE"`. Relaciones
    `reports_given` y `reports_received` en `User`, y export en `app/models/__init__.py`.
  - Migración Alembic `create_user_report`, `down_revision="9a1b2c3d4e5f"`.
  - `app/schemas/report.py`: `ReportReasonEnum` (`spam`, `harassment`, `inappropriate_content`,
    `fake_profile`, `other`) y `ReportCreate` con `model_config = ConfigDict(extra="forbid")`,
    `reason: ReportReasonEnum` y `detail: Optional[str] = Field(None, max_length=1000)`.
  - `app/core/exceptions/report.py`: `ReportSelfError` (400, `code="CANNOT_REPORT_SELF"`) y
    `ReportAlreadyExistsError` (409, `code="USER_REPORT_ALREADY_EXISTS"`).
  - `app/repositories/report_repository.py`: `add` (check-then-insert con captura de
    `IntegrityError` a 409) y `exists`.
  - `app/services/report_service.py`: `report_profile(db, current_user_id, profile_id, payload)`
    que valida el destino, registra el reporte y reutiliza `block_service.block_profile` para
    bloquear; si ya estaba bloqueado, absorbe `BlockAlreadyExistsError` (el reporte manda).
  - `POST /profiles/{profile_id}/report` con 204 en `app/routes/profile.py`, reutilizando
    `PROTECTED` y `NOT_FOUND` de `app/core/openapi.py`.
  - Regenerar `frontend/src/app/core/api/api.types.ts`.

- **Frontend**
  - `ReportApiService` (`@infrastructure/api/report`): `report(profileId, payload)` con
    `firstValueFrom`.
  - `ReportDialog` (`@shared/components/report-dialog`): OnPush, standalone, motivo obligatorio
    mediante botones de opción, textarea opcional de detalle, `input.isSubmitting` y outputs
    `dismissed` y `submitted`. Sigue el overlay de `ConfirmDestructiveDialog` y reutiliza `Button`.
  - `ReportButton` (`@shared/components/report-button`): abre el diálogo, envía el reporte y
    refresca `BlockService` al terminar, porque el backend deja al usuario bloqueado. Se coloca
    junto al `BlockButton` en el detalle de perfil, bajo el mismo guard `showBlockButton()`.
  - Etiquetas de motivo en español en un mapa de constantes junto al componente.

## No-goals
- NO panel de moderación, listado de reportes ni estados (pendiente, revisado, descartado): no
  existe concepto de admin en el modelo `User` y añadirlo es una fase aparte. Hasta entonces los
  reportes se consultan por SQL.
- NO notificaciones al reportado ni aviso por email al equipo.
- NO permitir reportar sin bloquear: en este MVP reportar implica bloquear, que es lo que hace útil
  el botón mientras no haya moderación detrás.
- NO editar ni retirar un reporte ya enviado; desbloquear no borra el reporte.
- NO reportar desde las tarjetas de la búsqueda: solo desde el detalle del perfil.

## Criterios de aceptación
- DADO un usuario autenticado CUANDO hace `POST /profiles/{id}/report` con un motivo válido sobre
  un perfil ajeno ENTONCES responde 204, queda un `UserReport` en BD y el reportado aparece en
  `GET /profiles/me/blocked`.
- DADO un usuario que ya bloqueó a otro CUANDO lo reporta ENTONCES responde 204 igualmente y sigue
  bloqueado.
- DADO un usuario que ya reportó a otro CUANDO lo reporta de nuevo ENTONCES responde 409 con `code`
  igual a `USER_REPORT_ALREADY_EXISTS`.
- DADO un usuario CUANDO reporta su propio perfil ENTONCES responde 400 con `code` igual a
  `CANNOT_REPORT_SELF`.
- DADO un usuario CUANDO reporta un `profile_id` inexistente ENTONCES responde 404.
- DADO un cuerpo con `reason` fuera del enum o `detail` de más de 1000 caracteres CUANDO se envía
  ENTONCES responde 422.
- DADO que no hay token CUANDO se llama al endpoint ENTONCES responde 401.
- DADO el detalle de un perfil ajeno con sesión iniciada CUANDO el usuario pulsa "Reportar", elige
  un motivo y confirma ENTONCES el diálogo se cierra y el perfil queda marcado como bloqueado en
  la UI.
- DADO un visitante sin sesión CUANDO abre el detalle de un perfil ENTONCES no ve el botón de
  reportar, igual que con el de bloquear.

## Decisión técnica
- **El reporte bloquea reutilizando `block_service.block_profile`** en lugar de duplicar la
  validación y el bloqueo. `report_service` orquesta: resuelve el usuario destino, delega la
  validación de auto-reporte, escribe el reporte y bloquea. Es la razón de que el alcance sea
  "reportar es reportar y bloquear": sin moderación detrás, un reporte que no produce ningún efecto
  visible es una promesa vacía.
- **`UniqueConstraint` por par reportador/reportado**, no por reporte: sin panel de moderación, N
  reportes del mismo usuario sobre el mismo destino no aportan información y abren la puerta a spam
  en la tabla. El 409 es explícito en vez de un 204 silencioso para que la UI pueda decir que ya
  lo reportó.
- **`code` explícito en las excepciones** desde el principio: en F4 los códigos derivados del
  nombre de clase no coincidían con el contrato de la spec y hubo que corregirlos después.
- **Diálogo propio, no PrimeNG**: `ConfirmDestructiveDialog` ya define el patrón de modal del
  proyecto; introducir `p-dialog` solo aquí rompería la consistencia visual.
- Alternativa descartada: un endpoint `POST /reports` de primer nivel. Se mantiene bajo
  `/profiles/{id}/...` por coherencia con `favorite` y `block`, que ya viven ahí.

## Plan de tests
- `backend/tests/profiles/test_reports.py` (pytest y TestClient, patrón de `test_blocks.py`): el
  reporte crea y bloquea (204 y presencia en `/profiles/me/blocked`); reportar a alguien ya
  bloqueado responde 204; duplicado 409 con su `code`; auto-reporte 400 con su `code`; perfil
  inexistente 404; `reason` inválido y `detail` de 1001 caracteres dan 422; sin token da 401.
- `frontend/src/app/shared/components/report-button/report-button.spec.ts` (Vitest, patrón de
  `block.service.spec.ts`): enviar con motivo llama a la API con el payload correcto y refresca
  `BlockService`; cancelar no llama a la API.

## Checklist de verificación
- [x] Backend: `ruff check .` — All checks passed
- [x] Backend: `ruff format --check .` — 94 files already formatted
- [x] Backend: `pytest` — **81 passed**
- [x] Migración `create_user_report` validada en Postgres limpio (cadena completa hasta `a1b2c3d4e5f6`)
- [x] Frontend: `npm run format:check` — All matched files use Prettier code style
- [x] Frontend: `npm run lint` — All files pass linting
- [x] Frontend: `npm run test:ci` — **27 passed** (6 files)
- [x] Frontend: `npm run build` — bundle generado sin errores
- [x] `api.types.ts` regenerado — 89 líneas, solo añadidos (1 path, 1 operación, 2 schemas)

## Resultado
Implementado backend y frontend según lo especificado.

- **Backend**: modelo `UserReport` con `UniqueConstraint` por par reportador/reportado, migración
  `a1b2c3d4e5f6_create_user_report` encadenada a `9a1b2c3d4e5f` y validada en Postgres limpio;
  `ReportReasonEnum` y `ReportCreate` en `app/schemas/report.py`; excepciones con `code` explícito;
  `report_repository` y `report_service`; `POST /profiles/{profile_id}/report` con 204.
  El servicio delega el bloqueo en `block_service.block_profile` y absorbe `BlockAlreadyExistsError`
  para que reportar a alguien ya bloqueado siga devolviendo 204.
- **Frontend**: `ReportApiService`, `ReportDialog` con motivo obligatorio y detalle opcional
  (siguiendo el overlay de `ConfirmDestructiveDialog`), y `ReportButton` con variante compacta para
  la barra de acciones móvil. Ambos botones del detalle de perfil comparten el guard
  `showBlockButton()`, así que un visitante sin sesión no ve ninguno. Los códigos
  `USER_REPORT_ALREADY_EXISTS` y `CANNOT_REPORT_SELF` se traducen en `core/errors/error-messages.ts`.

Corrección aplicada antes de cerrar: `MessageService` de PrimeNG no está provisto globalmente en
esta app, sino por componente (`onboarding` y `profile-edit`, cada uno con su `<p-toast>`).
`ReportButton` lo inyecta, así que en `profile-detail` habría lanzado `NullInjectorError` en
tiempo de ejecución — el build no lo detecta y los tests lo ocultaban con un mock. Se añade
`providers: [MessageService]` y `<p-toast>` a `profile-detail`, siguiendo el patrón existente.

---
tag: SPECS/2026-09-fix-profile-photos-endpoints
estado: approved
stack: backend
fecha: 2026-09-11
---

# fix-profile-photos-endpoints

## Contexto
- `POST /profiles/me/photos` (`app/routes/profile.py`) comprueba `file.size > 10 MB` **después** de
  que Starlette haya leído y volcado a disco todo el multipart, sin tope previo. En una VM de 256 MB,
  un cuerpo de varios GB llena el disco antes de llegar al `if`.
- `profile_photo_service.upload` no limita el número de fotos por perfil. El frontend limita a 6
  (`MAX_PHOTOS` en `features/onboarding/components/step-photos/step-photos.ts`), pero la API no: basta
  con llamarla directamente para consumir la cuota de Cloudinary. Con más de 50 fotos,
  `PATCH /me/photos/reorder` devuelve siempre 422 (`max_length=50`).
- `upload` es `async` y ejecuta SQL síncrono (`_get_profile_or_404`, `create_profile_photo`) dentro del
  event loop.
- `GET /profiles/me/photos` captura `HTTPException` para devolver `[]` sin perfil, pero el servicio
  lanza `ProfileNotFoundError` (un `AppError`): el `except` no hace nada y responde 404.

## Problema
La subida de fotos se puede usar para llenar el disco del servidor y la cuota de Cloudinary, bloquea
el event loop, y listar fotos sin perfil no devuelve lo que se pretendía.

## Alcance
- Middleware ASGI `BodySizeLimitMiddleware` (`app/core/body_limit.py`) para `POST /profiles/me/photos`:
  rechaza con 413 si `Content-Length` supera el límite, y corta la lectura si un cuerpo sin
  `Content-Length` lo supera.
- Tope de 6 fotos por perfil en `profile_photo_service.upload`, comprobado **antes** de subir a
  Cloudinary. Nueva excepción `PhotoLimitReachedError` (409, `code="PHOTO_LIMIT_REACHED"`).
- Las partes de BD de `upload` se ejecutan con `run_in_threadpool`.
- `GET /profiles/me/photos` captura `ProfileNotFoundError`.

## No-goals
- NO se cambia el límite de 10 MB por imagen ni la validación de cabecera de imagen.

## Criterios de aceptación
- DADO un `POST /profiles/me/photos` con `Content-Length` mayor que el límite ENTONCES responde 413 sin
  leer el cuerpo.
- DADO un perfil con 6 fotos CUANDO sube otra ENTONCES responde 409 `PHOTO_LIMIT_REACHED` y no se llama a
  Cloudinary.
- DADO un usuario sin perfil CUANDO pide `GET /profiles/me/photos` ENTONCES recibe `[]`.

## Decisión técnica
- Middleware en lugar de un check en la ruta: la ruta solo se ejecuta cuando el multipart ya se ha
  parseado, que es justo el problema.
- 6 fotos porque es el límite que ya aplica el frontend; el backend pasa a hacerlo cumplir.

## Plan de tests
- `tests/core/test_body_limit.py` (nuevo): 413 con `Content-Length` excesivo; otras rutas no se ven
  afectadas.
- `tests/profiles/test_photo_limits.py` (nuevo): la séptima foto da 409 sin llamar a la subida;
  `GET /me/photos` sin perfil devuelve `[]`.

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest`

## Resultado

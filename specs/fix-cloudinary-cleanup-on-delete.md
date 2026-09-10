---
tag: SPECS/2026-09-fix-cloudinary-cleanup-on-delete
estado: approved
stack: backend
fecha: 2026-09-10
---

# fix-cloudinary-cleanup-on-delete

## Contexto
Las fotos se suben a Cloudinary y solo se persiste el `secure_url` en `profile_photo`. Al borrar una foto (`DELETE /profiles/me/photos/{id}`), un perfil o una cuenta, el asset remoto nunca se elimina → fuga de almacenamiento.

## Problema
Los borrados de foto, perfil y usuario dejan huérfanos los assets en Cloudinary.

## Alcance
- `app/clients/storage_client.py`: añadir `delete_image(photo_url)` (síncrono) que extrae el `public_id` de la URL y llama a `cloudinary.uploader.destroy` (best-effort con `logger.warning`).
- `profile_photo_service.delete`: destruir el asset tras borrar la fila.
- `profile_service.delete_profile`: recopilar `photo_urls` antes de borrar el perfil y destruirlos después.
- `auth_service._delete_user_record`: recopilar `photo_urls` del perfil del usuario antes de borrar el user y destruirlos después.

## No-goals
- No añadir columna `public_id` (evita migración); se deriva de la URL.
- No fallar el borrado local si Cloudinary devuelve error (best-effort).

## Criterios de aceptación
- DADO un usuario que borra su foto, CUANDO se ejecuta `DELETE /profiles/me/photos/{id}`, ENTONCES se llama a `cloudinary.uploader.destroy` con el `public_id` de la URL.
- DADO un perfil/cuenta con fotos, CUANDO se borra, ENTONCES se destruyen sus assets remotos.

## Decisión técnica
- Extracción de `public_id` desde `secure_url` (formato `.../v<version>/[folder/]<public_id>.<ext>`): se elimina el segmento `v<version>` y se intenta `destroy` con y sin la extensión final para cubrir ambos formatos de `public_id` de Cloudinary.
- Reutiliza el `cloudinary` ya configurado en `storage_client`.

## Plan de tests
- Unitario de `extract_public_id_from_url` (pureza, sin red).

## Checklist de verificación
- [ ] Backend: `ruff check .`
- [ ] Backend: `ruff format --check .`
- [ ] Backend: `pytest --tb=short`

## Resultado
Pendiente.
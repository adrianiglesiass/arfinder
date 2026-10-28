# Legal documents

Source of truth for Arfinder's legal texts (user-facing content is in Spanish). The frontend renders the same content in `frontend/src/app/features/legal/`, using the controller data and dates from `frontend/src/app/core/constants/legal-info.ts`.

| Document | File | App route |
| --- | --- | --- |
| Privacy policy | [privacy_policy.md](privacy_policy.md) | `/privacidad` |
| Terms and conditions | [terms_and_conditions.md](terms_and_conditions.md) | `/terminos` |
| Cookies and local storage | [storage_policy.md](storage_policy.md) | `/cookies` |
| Legal notice (LSSI art. 10) | [legal_notice.md](legal_notice.md) | `/aviso-legal` |

When a document changes, update both the markdown file and the matching page, then bump `lastUpdated` and `LEGAL_DOCS_VERSION` in `legal-info.ts` together with `CURRENT_TERMS_VERSION` in `backend/app/core/constants.py`.

## Consent records

Every account (email, Google or Apple sign-up) must accept the Terms and conditions and the Privacy policy and confirm being 18+ before its profile is created. The acceptance is stored as legal-basis evidence in `user.terms_accepted_at` (UTC timestamp) and `user.terms_version` (the version accepted), via `POST /auth/me/consent`.

- New users accept it in the last onboarding step. The backend rejects profile creation with `403 TERMS_NOT_ACCEPTED` unless the current version was accepted.
- Users who already have a profile and have not accepted the current version get a blocking dialog in the app (accept or log out).
- The backend only accepts the current version (`422` otherwise).

**Versioning:** `CURRENT_TERMS_VERSION` in `backend/app/core/constants.py` and `LEGAL_DOCS_VERSION` in `frontend/src/app/core/constants/legal-info.ts` must always match — bump both together (and deploy the backend first), otherwise consent cannot be recorded. Bumping the version asks every existing user to accept again.

## Before production

- [x] Fill in controller data (name, NIF, address, contact email) in `legal-info.ts` and replace every `[PENDIENTE: ...]` placeholder in these documents.
- [ ] Confirm the Cloudinary account region and sign/accept its DPA; confirm the transfer mechanism (SCCs or Data Privacy Framework).
- [ ] Confirm DPAs and data locations for InsForge (auth and database), Fly.io and Vercel.
- [ ] Confirm where the production database is hosted and update the recipients table if it differs.
- [ ] Get a legal review of all documents.
- [x] Implement data export (portability) in-app: `GET /auth/me/export` downloads `arfinder-datos.json` from Editar perfil → Tus datos.
- [x] Delete profile photos from Cloudinary when a photo, the profile or the account is deleted (shipped in develop, PR #289; storage failures are logged and do not block the deletion).
- [ ] Verify on a real stored `photo_url` that the public_id includes the `arfinder/profiles/<user_id>/` folder (Cloudinary dynamic folders mode may keep the folder out of the public_id); otherwise photo deletion silently skips files. Review logged storage-deletion failures and remove those files manually.
- [ ] Set `ENVIRONMENT=production` on Fly (`fly.toml` `[env]` or a secret) so HSTS is sent; first confirm the `DEBUG` and `CORS_ORIGINS` secrets pass the production checks and that disabling `/auth/sync-cleanup` in production is intended.
- [x] Record explicit acceptance of the Terms and Privacy policy plus the 18+ confirmation at sign-up (`user.terms_accepted_at`, `user.terms_version`).

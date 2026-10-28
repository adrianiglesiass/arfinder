# Legal documents

Source of truth for Arfinder's legal texts (user-facing content is in Spanish). The frontend renders the same content in `frontend/src/app/features/legal/`, using the controller data and dates from `frontend/src/app/core/constants/legal-info.ts`.

| Document | File | App route |
| --- | --- | --- |
| Privacy policy | [privacy_policy.md](privacy_policy.md) | `/privacidad` |
| Terms and conditions | [terms_and_conditions.md](terms_and_conditions.md) | `/terminos` |
| Cookies and local storage | [storage_policy.md](storage_policy.md) | `/cookies` |
| Legal notice (LSSI art. 10) | [legal_notice.md](legal_notice.md) | `/aviso-legal` |

When a document changes, update both the markdown file and the matching page, then bump `lastUpdated` and `LEGAL_DOCS_VERSION` in `legal-info.ts`.

## Before production

- [x] Fill in controller data (name, NIF, address, contact email) in `legal-info.ts` and replace every `[PENDIENTE: ...]` placeholder in these documents.
- [ ] Confirm the Cloudinary account region and sign/accept its DPA; confirm the transfer mechanism (SCCs or Data Privacy Framework).
- [ ] Confirm DPAs and data locations for InsForge (auth and database), Fly.io and Vercel.
- [ ] Confirm where the production database is hosted and update the recipients table if it differs.
- [ ] Get a legal review of all documents.
- [ ] Implement data export (portability) in-app. Until then, the right is exercised by email — keep the policy wording in sync.
- [x] Delete profile photos from Cloudinary on account deletion (shipped in develop, PR #289).
- [ ] Add an age (18+) confirmation at sign-up if required after legal review.

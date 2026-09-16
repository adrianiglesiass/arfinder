/**
 * Legal identity and metadata shared by all legal pages.
 * Placeholders marked with `[PENDIENTE: ...]` must be filled in before production
 * (see docs/legal/README.md). Keep in sync with the markdown sources in docs/legal/.
 */
export const LEGAL_DOCS_VERSION = '1.0.0';

export interface LegalInfo {
  readonly appName: string;
  readonly controller: {
    readonly name: string;
    readonly taxId: string;
    readonly address: string;
  };
  readonly contactEmail: string;
  /** ISO date (YYYY-MM-DD) of the last change to any legal document. */
  readonly lastUpdated: string;
  readonly version: string;
  readonly supervisoryAuthority: {
    readonly name: string;
    readonly url: string;
  };
}

export const LEGAL_INFO: LegalInfo = {
  appName: 'Arfinder',
  controller: {
    name: '[PENDIENTE: nombre del responsable]',
    taxId: '[PENDIENTE: NIF]',
    address: '[PENDIENTE: domicilio]',
  },
  contactEmail: '[PENDIENTE: email de contacto]',
  lastUpdated: '2026-09-16',
  version: LEGAL_DOCS_VERSION,
  supervisoryAuthority: {
    name: 'Agencia Española de Protección de Datos (AEPD)',
    url: 'https://www.aepd.es',
  },
};

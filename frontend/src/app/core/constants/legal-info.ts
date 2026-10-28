/**
 * Legal identity and metadata shared by all legal pages.
 * Keep in sync with the markdown sources in docs/legal/.
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
    name: 'Adrian Iglesias Álvarez',
    taxId: 'DNI 54703474K',
    address: 'Capitán Juan Varela 33, 2.º',
  },
  contactEmail: 'adrianiglesias010@gmail.com',
  lastUpdated: '2026-10-28',
  version: LEGAL_DOCS_VERSION,
  supervisoryAuthority: {
    name: 'Agencia Española de Protección de Datos (AEPD)',
    url: 'https://www.aepd.es',
  },
};

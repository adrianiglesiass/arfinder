import { needsTermsConsent } from './terms-consent';

const VERSION = '1.0.0';

describe('needsTermsConsent', () => {
  it('requires consent when the user is unknown', () => {
    expect(needsTermsConsent(null, VERSION)).toBe(true);
    expect(needsTermsConsent(undefined, VERSION)).toBe(true);
  });

  it('requires consent when the user never accepted', () => {
    expect(needsTermsConsent({ terms_accepted_at: null, terms_version: null }, VERSION)).toBe(true);
  });

  it('requires consent again when an older version was accepted', () => {
    expect(
      needsTermsConsent(
        { terms_accepted_at: '2026-01-01T00:00:00Z', terms_version: '0.9.0' },
        VERSION
      )
    ).toBe(true);
  });

  it('does not require consent when the current version was accepted', () => {
    expect(
      needsTermsConsent(
        { terms_accepted_at: '2026-09-16T10:00:00Z', terms_version: VERSION },
        VERSION
      )
    ).toBe(false);
  });
});

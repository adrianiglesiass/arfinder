import type { UserResponse } from '@core/api/api.models';

/**
 * Whether the user still has to accept the legal documents (Terms, Privacy, 18+).
 * An unknown user is treated as not having consented.
 */
export function needsTermsConsent(
  user: Pick<UserResponse, 'terms_accepted_at' | 'terms_version'> | null | undefined,
  currentVersion: string
): boolean {
  if (!user?.terms_accepted_at) return true;
  return user.terms_version !== currentVersion;
}

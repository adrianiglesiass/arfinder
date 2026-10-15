/** Mirrors the backend limits in `app/schemas/profile.py`. */
export const PROFILE_LIMITS = {
  nameMaxLength: 100,
  cityMaxLength: 100,
  bioMaxLength: 2000,
  roomDescriptionMaxLength: 3000,
  minAge: 18,
  maxAge: 120,
} as const;

export interface ProfileBasics {
  name?: string | null;
  age?: number | null;
  city?: string | null;
}

export function isValidAge(age: number | null | undefined): boolean {
  if (age === null || age === undefined || !Number.isInteger(Number(age))) return false;
  const value = Number(age);
  return value >= PROFILE_LIMITS.minAge && value <= PROFILE_LIMITS.maxAge;
}

/** Required fields shared by onboarding step 1 and the profile edit form. */
export function isProfileBasicsValid(form: ProfileBasics): boolean {
  return !!form.name?.trim() && !!form.city?.trim() && isValidAge(form.age);
}

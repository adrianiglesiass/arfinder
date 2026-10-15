import type { ProfileSearchFilters, TypeEnum } from '@core/api/api.models';

/**
 * `max_budget` is a seeker's budget or a room's price depending on the profile type, so the
 * budget filter compares in the direction that fits what is being listed:
 * - `max`: rooms priced at most X (`budget_max`).
 * - `min`: seekers who can pay at least X (`budget_min`).
 */
export type BudgetDirection = 'min' | 'max';

/** Slider range; the profile form uses the same bounds. */
export const BUDGET_RANGE = { min: 200, max: 1500, step: 50 } as const;

interface BudgetText {
  label: string;
  unset: string;
  /** Shown when no type is chosen: setting an amount selects the type it applies to. */
  hint: string;
}

export const BUDGET_TEXT: Record<BudgetDirection, BudgetText> = {
  min: {
    label: 'Presupuesto mínimo',
    unset: 'Sin mínimo',
    hint: 'Al fijarlo verás solo perfiles que buscan piso',
  },
  max: {
    label: 'Precio máx. habitación',
    unset: 'Sin límite',
    hint: 'Al fijarlo verás solo habitaciones',
  },
};

/** The slider end that means "no filter": the cheapest end for `min`, the dearest for `max`. */
export const budgetNeutral = (direction: BudgetDirection): number =>
  direction === 'min' ? BUDGET_RANGE.min : BUDGET_RANGE.max;

/** Null when the value sits at (or past) the neutral end, i.e. it filters nothing. */
export const normalizeBudget = (direction: BudgetDirection, value: number): number | null => {
  if (direction === 'min') return value <= BUDGET_RANGE.min ? null : value;
  return value >= BUDGET_RANGE.max ? null : value;
};

export const budgetChipLabel = (direction: BudgetDirection, value: number): string =>
  direction === 'min' ? `Presupuesto desde ${value} €` : `Precio hasta ${value} €`;

/** Who is listed: the chosen type or, without one, the opposite of the viewer's own type. */
const listedType = (filterType: TypeEnum | null, viewerType: TypeEnum | null): TypeEnum | null => {
  if (filterType) return filterType;
  if (viewerType === 'looking_for_roommate') return 'looking_for_flat';
  if (viewerType === 'looking_for_flat') return 'looking_for_roommate';
  return null;
};

export const budgetDirectionFor = (
  filterType: TypeEnum | null,
  viewerType: TypeEnum | null
): BudgetDirection => (listedType(filterType, viewerType) === 'looking_for_flat' ? 'min' : 'max');

/** Direction of the budget filter in use; an explicit param wins so the panel describes the query. */
export const budgetDirection = (
  filters: ProfileSearchFilters,
  viewerType: TypeEnum | null
): BudgetDirection => {
  if (filters.budget_min != null) return 'min';
  if (filters.budget_max != null) return 'max';
  return budgetDirectionFor(filters.profile_type ?? null, viewerType);
};

export const budgetValue = (filters: ProfileSearchFilters): number | null =>
  filters.budget_min ?? filters.budget_max ?? null;

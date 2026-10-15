import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Slider } from 'primeng/slider';

import type { ProfileSearchFilters, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import {
  type FilterPatch,
  ProfileSearchService,
} from '@core/profile-search/profile-search.service';
import { ProfileService } from '@core/profile/profile.service';

import { CityAutocomplete } from '@shared/components/city-autocomplete/city-autocomplete';
import {
  FilterChipGroup,
  type FilterChipOption,
} from '@shared/components/filter-chip-group/filter-chip-group';
import { uniqueId } from '@shared/utils/unique-id';

import {
  BUDGET_RANGE,
  BUDGET_TEXT,
  type BudgetDirection,
  budgetDirection,
  budgetDirectionFor,
  budgetNeutral,
  budgetValue,
  normalizeBudget,
} from '@features/search-profile/budget-filter';

type TriState = 'any' | 'yes' | 'no';
type BudgetPatch = Pick<FilterPatch, 'budget_min' | 'budget_max'>;

const TRI_STATE_OPTIONS: FilterChipOption<TriState>[] = [
  { label: 'Cualquiera', value: 'any' },
  { label: 'Sí', value: 'yes' },
  { label: 'No', value: 'no' },
];

const TYPE_OPTIONS: FilterChipOption<TypeEnum>[] = [
  { label: 'Busca piso', value: 'looking_for_flat' },
  { label: 'Busca compañero', value: 'looking_for_roommate' },
];

const SCHEDULE_OPTIONS: FilterChipOption<ScheduleEnum>[] = [
  { label: 'Mañana', value: 'morning' },
  { label: 'Tarde', value: 'afternoon' },
  { label: 'Noche', value: 'night' },
  { label: 'Flexible', value: 'flexible' },
];

const GENDER_OPTIONS: FilterChipOption<string>[] = [
  { label: 'Mujer', value: 'Mujer' },
  { label: 'Hombre', value: 'Hombre' },
  { label: 'Prefiero no decirlo', value: 'Prefiero no decirlo' },
];

const AGE_MIN_LIMIT = 18;
const AGE_MAX_LIMIT = 99;

@Component({
  selector: 'app-search-filters',
  imports: [
    FormsModule,
    InputNumberModule,
    InputTextModule,
    FilterChipGroup,
    CityAutocomplete,
    Slider,
  ],
  templateUrl: './search-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFilters {
  private readonly searchService = inject(ProfileSearchService);
  private readonly profileService = inject(ProfileService);
  private readonly viewerType = computed(() => this.profileService.currentProfile()?.type ?? null);

  protected readonly ids = {
    city: uniqueId('filter-city'),
    budget: uniqueId('filter-budget'),
    age: uniqueId('filter-age'),
    availableFrom: uniqueId('filter-available-from'),
  };

  readonly typeOptions = TYPE_OPTIONS;
  readonly scheduleOptions = SCHEDULE_OPTIONS;
  readonly triStateOptions = TRI_STATE_OPTIONS;
  readonly genderOptions = GENDER_OPTIONS;

  readonly budgetRangeMin = BUDGET_RANGE.min;
  readonly budgetRangeMax = BUDGET_RANGE.max;
  readonly budgetStep = BUDGET_RANGE.step;

  readonly ageMinLimit = AGE_MIN_LIMIT;
  readonly ageMaxLimit = AGE_MAX_LIMIT;

  private readonly filters = this.searchService.filters;

  readonly profileType = computed(() => this.filters().profile_type ?? null);
  readonly schedule = computed(() => this.filters().schedule ?? null);
  readonly hasPets = computed(() => this.boolToTriState(this.filters().has_pets));
  readonly isSmoker = computed(() => this.boolToTriState(this.filters().is_smoker));
  readonly ageMin = computed(() => this.toNumber(this.filters().age_min));
  readonly ageMax = computed(() => this.toNumber(this.filters().age_max));
  readonly availableFrom = computed(() => this.filters().available_from ?? '');
  readonly gender = computed(() => this.filters().gender ?? null);
  readonly budgetDirection = computed(() => budgetDirection(this.filters(), this.viewerType()));
  readonly budgetText = computed(() => BUDGET_TEXT[this.budgetDirection()]);
  readonly budgetSliderValue = signal<number>(this.sliderValueFromFilters());
  readonly budgetDisplay = computed(() =>
    normalizeBudget(this.budgetDirection(), this.budgetSliderValue())
  );
  readonly city = computed(() => this.filters().city ?? '');

  constructor() {
    effect(() => {
      const next = this.sliderValueFromFilters();
      if (next !== untracked(() => this.budgetSliderValue())) {
        this.budgetSliderValue.set(next);
      }
    });
  }

  readonly activeCount = computed(
    () =>
      Object.values(this.filters()).filter((v) => v !== null && v !== undefined && v !== '').length
  );

  setType(value: TypeEnum | null) {
    const amount = budgetValue(this.filters());
    const from = this.budgetDirection();
    const to = budgetDirectionFor(value, this.viewerType());
    if (amount === null || from === to) {
      this.searchService.updateFilter('profile_type', value);
      return;
    }
    // Same reference rent, compared the other way round for the newly listed profiles.
    this.searchService.updateFilters({
      profile_type: value,
      ...this.budgetPatch(to, normalizeBudget(to, amount)),
    });
  }

  setSchedule(value: ScheduleEnum | null) {
    this.searchService.updateFilter('schedule', value);
  }

  setHasPets(value: TriState | null) {
    this.searchService.updateFilter('has_pets', this.triStateToBool(value));
  }

  setIsSmoker(value: TriState | null) {
    this.searchService.updateFilter('is_smoker', this.triStateToBool(value));
  }

  setCity(value: string) {
    this.searchService.updateFilter('city', value || null);
  }

  setGender(value: string | null) {
    this.searchService.updateFilter('gender', value);
  }

  setAgeMin(value: number | null) {
    this.searchService.updateFilter('age_min', value);
  }

  setAgeMax(value: number | null) {
    this.searchService.updateFilter('age_max', value);
  }

  setAvailableFrom(value: string) {
    this.searchService.updateFilter('available_from', value || null);
  }

  onBudgetSlide(value: number | null) {
    if (value === null) return;
    this.budgetSliderValue.set(value);
  }

  commitBudget() {
    const direction = this.budgetDirection();
    this.searchService.updateFilters(
      this.budgetPatch(direction, normalizeBudget(direction, this.budgetSliderValue()))
    );
  }

  reset() {
    this.searchService.reset();
  }

  /** Sets the param of `direction` and clears the other one: both are never sent together. */
  private budgetPatch(direction: BudgetDirection, value: number | null): BudgetPatch {
    return direction === 'min'
      ? { budget_min: value, budget_max: null }
      : { budget_max: value, budget_min: null };
  }

  private sliderValueFromFilters(): number {
    return budgetValue(this.filters()) ?? budgetNeutral(this.budgetDirection());
  }

  private boolToTriState(value: ProfileSearchFilters['has_pets']): TriState {
    if (value === true || value === 'true') return 'yes';
    if (value === false || value === 'false') return 'no';
    return 'any';
  }

  private triStateToBool(value: TriState | null): boolean | null {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return null;
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

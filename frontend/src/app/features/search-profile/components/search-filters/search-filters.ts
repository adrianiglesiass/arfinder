import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputNumberModule } from 'primeng/inputnumber';
import { Slider } from 'primeng/slider';

import type { ProfileSearchFilters, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { ProfileSearchService } from '@core/profileSearch/profile-search.service';

import {
  FilterChipGroup,
  type FilterChipOption,
} from '@shared/components/filter-chip-group/filter-chip-group';

import { Search } from '@features/search/search';

type TriState = 'any' | 'yes' | 'no';

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

const BUDGET_MIN = 200;
const BUDGET_MAX = 1500;
const BUDGET_STEP = 50;

@Component({
  selector: 'app-search-filters',
  imports: [FormsModule, InputNumberModule, FilterChipGroup, Search, Slider],
  templateUrl: './search-filters.html',
})
export class SearchFilters {
  private readonly searchService = inject(ProfileSearchService);

  readonly typeOptions = TYPE_OPTIONS;
  readonly scheduleOptions = SCHEDULE_OPTIONS;
  readonly triStateOptions = TRI_STATE_OPTIONS;

  readonly budgetMin = BUDGET_MIN;
  readonly budgetMaxLimit = BUDGET_MAX;
  readonly budgetStep = BUDGET_STEP;

  private readonly filters = this.searchService.filters;

  readonly profileType = computed(() => this.filters().profile_type ?? null);
  readonly schedule = computed(() => this.filters().schedule ?? null);
  readonly hasPets = computed(() => this.boolToTriState(this.filters().has_pets));
  readonly isSmoker = computed(() => this.boolToTriState(this.filters().is_smoker));
  readonly ageMin = computed(() => this.toNumber(this.filters().age_min));
  readonly ageMax = computed(() => this.toNumber(this.filters().age_max));
  readonly budgetMax = computed(() => this.filters().budget_max ?? null);
  readonly budgetSliderValue = computed(() => this.filters().budget_max ?? BUDGET_MAX);
  readonly city = computed(() => this.filters().city ?? '');

  readonly activeCount = computed(
    () =>
      Object.values(this.filters()).filter((v) => v !== null && v !== undefined && v !== '').length
  );

  setType(value: TypeEnum | null) {
    this.searchService.updateFilter('profile_type', value);
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

  setAgeMin(value: number | null) {
    this.searchService.updateFilter('age_min', value);
  }

  setAgeMax(value: number | null) {
    this.searchService.updateFilter('age_max', value);
  }

  setBudgetMax(value: number | null) {
    const normalized = value === null || value >= BUDGET_MAX ? null : value;
    this.searchService.updateFilter('budget_max', normalized);
  }

  reset() {
    this.searchService.reset();
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

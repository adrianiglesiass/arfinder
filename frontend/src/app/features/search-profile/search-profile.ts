import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  Renderer2,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';

import type { ProfileSearchFilters, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { RightPanelService } from '@core/layout/right-panel.service';
import { ProfileSearchService } from '@core/profileSearch/profile-search.service';

import { Button } from '@shared/components/button/button';

import { SearchFilters } from '@features/search-profile/components/search-filters/search-filters';
import { SearchResults } from '@features/search-profile/components/search-results/search-results';

const DISMISS_THRESHOLD_PX = 120;
const BODY_LOCK_CLASS = 'overflow-hidden';

const TYPE_LABELS: Record<TypeEnum, string> = {
  looking_for_flat: 'Busca piso',
  looking_for_roommate: 'Busca compañero',
};

const SCHEDULE_LABELS: Record<ScheduleEnum, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
  flexible: 'Flexible',
};

type FilterKey = keyof ProfileSearchFilters;
type ChipKey = FilterKey | 'age_range';
interface ActiveChip {
  key: ChipKey;
  label: string;
}

const ageLabel = (min: number | null, max: number | null): string | null => {
  if (min !== null && max !== null) return `${min}–${max} años`;
  if (min !== null) return `Desde ${min} años`;
  if (max !== null) return `Hasta ${max} años`;
  return null;
};

const toAgeNumber = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

@Component({
  selector: 'app-search-profile',
  imports: [SearchFilters, SearchResults, Button],
  templateUrl: './search-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SearchProfile implements AfterViewInit, OnDestroy {
  private readonly rightPanel = inject(RightPanelService);
  private readonly searchService = inject(ProfileSearchService);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  protected readonly filtersOpen = signal(false);
  protected readonly filtersTpl = viewChild.required<TemplateRef<unknown>>('filtersTpl');

  protected readonly dragY = signal(0);
  protected readonly isDragging = signal(false);
  private dragStartY = 0;

  protected readonly isLoading = this.searchService.isLoading;
  protected readonly hasMore = this.searchService.hasMore;
  protected readonly profiles = this.searchService.profiles;

  protected readonly resultsLabel = computed(() => {
    const count = this.profiles().length;
    if (count === 0) return 'Sin resultados';
    const suffix = this.hasMore() ? '+' : '';
    return `${count}${suffix} ${count === 1 ? 'perfil encontrado' : 'perfiles encontrados'}`;
  });

  protected readonly activeFilterCount = computed(() => this.activeChips().length);

  protected readonly activeChips = computed<ActiveChip[]>(() => {
    const f = this.searchService.filters();
    const chips: ActiveChip[] = [];
    if (f.city) chips.push({ key: 'city', label: f.city });
    if (f.profile_type) chips.push({ key: 'profile_type', label: TYPE_LABELS[f.profile_type] });
    if (f.budget_max) chips.push({ key: 'budget_max', label: `Hasta ${f.budget_max} €` });
    if (f.schedule) chips.push({ key: 'schedule', label: SCHEDULE_LABELS[f.schedule] });
    if (f.has_pets === true) chips.push({ key: 'has_pets', label: 'Acepta mascotas' });
    else if (f.has_pets === false) chips.push({ key: 'has_pets', label: 'Sin mascotas' });
    if (f.is_smoker === true) chips.push({ key: 'is_smoker', label: 'Fumador/a' });
    else if (f.is_smoker === false) chips.push({ key: 'is_smoker', label: 'No fumador/a' });
    if (f.gender) chips.push({ key: 'gender', label: f.gender });
    const ageMin = toAgeNumber(f.age_min);
    const ageMax = toAgeNumber(f.age_max);
    const age = ageLabel(ageMin, ageMax);
    if (age) chips.push({ key: 'age_range', label: age });
    return chips;
  });

  constructor() {
    effect(() => {
      const open = this.filtersOpen();
      if (open) {
        this.renderer.addClass(this.document.body, BODY_LOCK_CLASS);
      } else {
        this.renderer.removeClass(this.document.body, BODY_LOCK_CLASS);
      }
    });
  }

  ngAfterViewInit(): void {
    this.rightPanel.set(this.filtersTpl());
  }

  ngOnDestroy(): void {
    this.rightPanel.clear();
    this.renderer.removeClass(this.document.body, BODY_LOCK_CLASS);
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
  }

  closeFilters() {
    this.filtersOpen.set(false);
    this.dragY.set(0);
  }

  removeFilter(key: ChipKey) {
    if (key === 'age_range') {
      this.searchService.updateFilter('age_min', null);
      this.searchService.updateFilter('age_max', null);
      return;
    }
    this.searchService.updateFilter(key, null);
  }

  onDragStart(event: TouchEvent): void {
    this.dragStartY = event.touches[0].clientY;
    this.isDragging.set(true);
  }

  onDragMove(event: TouchEvent): void {
    if (!this.isDragging()) return;
    const delta = event.touches[0].clientY - this.dragStartY;
    this.dragY.set(Math.max(0, delta));
  }

  onDragEnd(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (this.dragY() > DISMISS_THRESHOLD_PX) {
      this.closeFilters();
    } else {
      this.dragY.set(0);
    }
  }
}

import { Location } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { ProfileSearchApiService } from '@infrastructure/api/profile-search/profile-search.api.service';
import { filter } from 'rxjs';

import type {
  ProfileSearchFilters,
  ProfileSummary,
  ScheduleEnum,
  TypeEnum,
} from '@core/api/api.models';

const SCHEDULE_VALUES: ReadonlySet<string> = new Set(['morning', 'afternoon', 'night', 'flexible']);
const TYPE_VALUES: ReadonlySet<string> = new Set(['looking_for_flat', 'looking_for_roommate']);

const PAGE_SIZE = 24;

@Injectable({ providedIn: 'root' })
export class ProfileSearchService {
  private readonly api = inject(ProfileSearchApiService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly filters = signal<ProfileSearchFilters>(this.readFromUrl());

  readonly hasActiveFilters = computed(() =>
    Object.values(this.filters()).some((v) => v !== null && v !== undefined && v !== '')
  );

  readonly profiles = signal<ProfileSummary[]>([]);
  readonly deckIndex = signal(0);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly hasMore = signal(true);
  readonly error = signal<unknown | null>(null);

  private currentPage = 0;
  private requestId = 0;

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        const next = this.readFromUrl();
        if (!this.sameFilters(next, this.filters())) {
          this.filters.set(next);
        }
      });

    effect(() => {
      this.filters();
      this.writeToUrl(this.filters());
      void this.resetAndLoad();
    });
  }

  updateFilter<K extends keyof ProfileSearchFilters>(
    key: K,
    value: ProfileSearchFilters[K] | null | undefined
  ): void {
    this.filters.update((current) => {
      const next = { ...current };
      if (value === null || value === undefined || (typeof value === 'string' && value === '')) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  reset(): void {
    this.filters.set({});
  }

  retry(): void {
    void this.resetAndLoad();
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.isLoading() || this.isLoadingMore()) return;
    this.currentPage += 1;
    await this.loadPage(this.currentPage);
  }

  private async resetAndLoad(): Promise<void> {
    this.currentPage = 0;
    this.deckIndex.set(0);
    this.profiles.set([]);
    this.hasMore.set(true);
    this.error.set(null);
    await this.loadPage(0);
  }

  private async loadPage(page: number): Promise<void> {
    const isFirst = page === 0;
    const reqId = ++this.requestId;

    if (isFirst) this.isLoading.set(true);
    else this.isLoadingMore.set(true);

    try {
      const data = await this.api.search({
        ...this.filters(),
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      if (reqId !== this.requestId) return;
      this.profiles.update((prev) => (isFirst ? data : [...prev, ...data]));
      this.hasMore.set(data.length === PAGE_SIZE);
    } catch (e) {
      if (reqId !== this.requestId) return;
      this.error.set(e);
      this.hasMore.set(false);
    } finally {
      if (reqId === this.requestId) {
        if (isFirst) this.isLoading.set(false);
        else this.isLoadingMore.set(false);
      }
    }
  }

  private readFromUrl(): ProfileSearchFilters {
    const params = this.router.parseUrl(this.router.url).queryParamMap;
    const out: ProfileSearchFilters = {};

    const city = params.get('city');
    if (city) out.city = city;

    const budget_max = params.get('budget_max');
    if (budget_max !== null && !Number.isNaN(Number(budget_max))) {
      out.budget_max = Number(budget_max);
    }

    const has_pets = params.get('has_pets');
    if (has_pets === 'true') out.has_pets = true;
    else if (has_pets === 'false') out.has_pets = false;

    const is_smoker = params.get('is_smoker');
    if (is_smoker === 'true') out.is_smoker = true;
    else if (is_smoker === 'false') out.is_smoker = false;

    const schedule = params.get('schedule');
    if (schedule && SCHEDULE_VALUES.has(schedule)) {
      out.schedule = schedule as ScheduleEnum;
    }

    const profile_type = params.get('profile_type');
    if (profile_type && TYPE_VALUES.has(profile_type)) {
      out.profile_type = profile_type as TypeEnum;
    }

    const gender = params.get('gender');
    if (gender) out.gender = gender;

    const age_min = params.get('age_min');
    if (age_min !== null && !Number.isNaN(Number(age_min))) {
      out.age_min = Number(age_min);
    }

    const age_max = params.get('age_max');
    if (age_max !== null && !Number.isNaN(Number(age_max))) {
      out.age_max = Number(age_max);
    }

    return out;
  }

  private writeToUrl(filters: ProfileSearchFilters): void {
    const [path, existingQuery = ''] = this.location.path(true).split('?');
    const search = new URLSearchParams();

    const append = (key: string, value: unknown) => {
      if (value === null || value === undefined || value === '') return;
      search.set(key, String(value));
    };

    append('city', filters.city);
    append('budget_max', filters.budget_max);
    append('has_pets', filters.has_pets);
    append('is_smoker', filters.is_smoker);
    append('schedule', filters.schedule);
    append('profile_type', filters.profile_type);
    append('gender', filters.gender);
    append('age_min', filters.age_min);
    append('age_max', filters.age_max);

    const newQuery = search.toString();
    if (newQuery === existingQuery) return;
    this.location.replaceState(newQuery ? `${path}?${newQuery}` : path);
  }

  private sameFilters(a: ProfileSearchFilters, b: ProfileSearchFilters): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
        return false;
      }
    }
    return true;
  }
}

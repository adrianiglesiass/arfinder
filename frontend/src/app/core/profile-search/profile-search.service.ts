import { Location } from '@angular/common';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
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
import { AuthService } from '@core/auth/auth.service';
import { BlockEvents } from '@core/block/block-events';
import { ROUTES } from '@core/constants/routes';

const SCHEDULE_VALUES: ReadonlySet<string> = new Set(['morning', 'afternoon', 'night', 'flexible']);
const TYPE_VALUES: ReadonlySet<string> = new Set(['looking_for_flat', 'looking_for_roommate']);

const PAGE_SIZE = 24;
const STALE_AFTER_MS = 2 * 60 * 1000;
const MAX_REFRESH_PAGES = 4;

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
  readonly loadMoreError = signal(false);

  private currentPage = 0;
  private requestId = 0;
  private lastLoadedAt: number | null = null;
  private lastUserId: number | null | undefined = undefined;

  constructor() {
    const auth = inject(AuthService);
    effect(() => {
      const userId = auth.currentUser()?.id ?? null;
      untracked(() => this.onUserChange(userId));
    });

    inject(BlockEvents)
      .changes$.pipe(takeUntilDestroyed())
      .subscribe(({ profileId, blocked }) => {
        if (blocked) this.removeProfile(profileId);
        else this.lastLoadedAt = null;
      });

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        if (!this.isOnExplore()) return;
        const fromUrl = this.readFromUrl();
        if (Object.keys(fromUrl).length > 0) {
          if (!this.sameFilters(fromUrl, this.filters())) {
            this.filters.set(fromUrl);
            return;
          }
        } else if (this.hasActiveFilters()) {
          this.writeToUrl(this.filters());
        }
        this.refreshIfStale();
      });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.refreshIfStale();
      });
    }

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

  removeProfile(profileId: number): void {
    const index = this.profiles().findIndex((p) => p.id === profileId);
    if (index === -1) return;
    this.profiles.update((list) => list.filter((p) => p.id !== profileId));
    if (index < this.deckIndex()) this.deckIndex.update((i) => i - 1);
    if (this.deckIndex() >= this.profiles().length && this.hasMore()) void this.loadMore();
  }

  retry(): void {
    void this.resetAndLoad();
  }

  retryLoadMore(): void {
    this.loadMoreError.set(false);
    void this.loadMore();
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.isLoading() || this.isLoadingMore() || this.loadMoreError()) {
      return;
    }
    this.currentPage += 1;
    await this.loadPage(this.currentPage);
  }

  private isOnExplore(): boolean {
    return this.router.url.split('?')[0] === ROUTES.EXPLORE;
  }

  private onUserChange(userId: number | null): void {
    if (this.lastUserId === undefined) {
      this.lastUserId = userId;
      return;
    }
    if (userId === this.lastUserId) return;
    const previousUserId = this.lastUserId;
    this.lastUserId = userId;
    this.lastLoadedAt = null;
    if (previousUserId !== null && this.hasActiveFilters()) {
      this.filters.set({});
      return;
    }
    if (this.isOnExplore()) void this.resetAndLoad();
  }

  private refreshIfStale(): void {
    if (!this.isOnExplore()) return;
    if (this.isLoading() || this.isLoadingMore()) return;
    if (this.lastLoadedAt !== null && Date.now() - this.lastLoadedAt < STALE_AFTER_MS) return;
    if (this.currentPage + 1 > MAX_REFRESH_PAGES) {
      this.lastLoadedAt = Date.now();
      return;
    }
    if (this.profiles().length > 0 && this.lastLoadedAt !== null) void this.refreshInPlace();
    else void this.resetAndLoad();
  }

  private async resetAndLoad(): Promise<void> {
    this.currentPage = 0;
    this.deckIndex.set(0);
    this.profiles.set([]);
    this.hasMore.set(true);
    this.error.set(null);
    this.loadMoreError.set(false);
    this.isLoadingMore.set(false);
    await this.loadPage(0);
  }

  private async refreshInPlace(): Promise<void> {
    const pages = Math.min(this.currentPage + 1, MAX_REFRESH_PAGES);
    const reqId = ++this.requestId;
    try {
      const data = await this.api.search({
        ...this.filters(),
        skip: 0,
        limit: pages * PAGE_SIZE,
      });
      if (reqId !== this.requestId) return;
      const previous = this.profiles();
      const wasExhausted = this.deckIndex() >= previous.length;
      const currentId = previous[this.deckIndex()]?.id;
      this.profiles.set(data);
      this.currentPage = pages - 1;
      this.hasMore.set(data.length === pages * PAGE_SIZE);
      this.error.set(null);
      this.loadMoreError.set(false);
      this.lastLoadedAt = Date.now();
      const index = currentId === undefined ? -1 : data.findIndex((p) => p.id === currentId);
      if (wasExhausted) this.deckIndex.set(data.length);
      else if (index >= 0) this.deckIndex.set(index);
      else this.deckIndex.set(Math.min(this.deckIndex(), Math.max(0, data.length - 1)));
    } catch {
      if (reqId !== this.requestId) return;
      this.lastLoadedAt = Date.now();
    }
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
      if (isFirst) this.lastLoadedAt = Date.now();
    } catch (e) {
      if (reqId !== this.requestId) return;
      if (isFirst) {
        this.error.set(e);
        this.hasMore.set(false);
      } else {
        this.currentPage -= 1;
        this.loadMoreError.set(true);
      }
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

    const available_from = params.get('available_from');
    if (available_from) out.available_from = available_from;

    return out;
  }

  private writeToUrl(filters: ProfileSearchFilters): void {
    if (!this.isOnExplore()) return;
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
    append('available_from', filters.available_from);

    const newQuery = search.toString();
    if (newQuery === existingQuery) return;
    this.location.replaceState(
      newQuery ? `${path}?${newQuery}` : path,
      '',
      this.location.getState()
    );
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

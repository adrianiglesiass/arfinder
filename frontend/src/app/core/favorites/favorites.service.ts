import { HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FavoritesApiService } from '@infrastructure/api/favorites/favorites.api.service';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockEvents } from '@core/block/block-events';

const MAX_REFRESH_ATTEMPTS = 3;

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly api = inject(FavoritesApiService);
  private readonly auth = inject(AuthService);

  readonly favoriteIds = signal<ReadonlySet<number>>(new Set());
  readonly profiles = signal<ProfileSummary[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal(false);

  private initializing: Promise<void> | null = null;
  private readonly pending = new Set<number>();
  private version = 0;
  private currentUserId: number | null = null;

  constructor() {
    inject(BlockEvents)
      .changes$.pipe(takeUntilDestroyed())
      .subscribe(({ profileId, blocked }) => void this.syncWithBlock(profileId, blocked));

    effect(() => {
      const user = this.auth.currentUser();
      const id = user?.id ?? null;
      if (id !== this.currentUserId) {
        this.currentUserId = id;
        if (id != null) void this.bootstrap();
        else this.reset();
      }
    });
  }

  async refresh(): Promise<void> {
    if (!this.auth.currentUser()) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      this.isLoading.set(true);
      try {
        for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
          const startedAt = this.version;
          const list = await this.api.getMyFavorites();
          if (this.version !== startedAt && attempt < MAX_REFRESH_ATTEMPTS) continue;
          this.profiles.set(list);
          this.favoriteIds.set(new Set(list.map((p) => p.id)));
          break;
        }
        this.error.set(false);
      } catch {
        this.error.set(true);
      } finally {
        this.isLoading.set(false);
        this.initializing = null;
      }
    })();
    return this.initializing;
  }

  async toggle(profileId: number): Promise<void> {
    if (this.pending.has(profileId)) return;
    this.pending.add(profileId);
    this.version++;
    const wasFavorite = this.favoriteIds().has(profileId);
    const removedProfile = this.profiles().find((p) => p.id === profileId);

    this.applyFavorite(profileId, !wasFavorite);

    try {
      if (wasFavorite) await this.api.unfavorite(profileId);
      else await this.api.favorite(profileId);
    } catch (err) {
      if (!wasFavorite && err instanceof HttpErrorResponse && err.status === 409) return;
      this.applyFavorite(profileId, wasFavorite);
      if (wasFavorite && removedProfile) {
        this.profiles.update((list) =>
          list.some((p) => p.id === removedProfile.id) ? list : [removedProfile, ...list]
        );
      }
    } finally {
      this.pending.delete(profileId);
      this.version++;
    }
  }

  private async syncWithBlock(profileId: number, blocked: boolean): Promise<void> {
    if (blocked) this.forget(profileId);
    await this.refresh();
    if (blocked) this.forget(profileId);
  }

  private forget(profileId: number): void {
    this.favoriteIds.update((set) => {
      if (!set.has(profileId)) return set;
      const next = new Set(set);
      next.delete(profileId);
      return next;
    });
    this.profiles.update((list) => list.filter((p) => p.id !== profileId));
  }

  private bootstrap(): Promise<void> {
    return this.refresh();
  }

  private reset(): void {
    this.favoriteIds.set(new Set());
    this.profiles.set([]);
  }

  private applyFavorite(profileId: number, favorite: boolean): void {
    this.favoriteIds.update((set) => {
      const next = new Set(set);
      if (favorite) next.add(profileId);
      else next.delete(profileId);
      return next;
    });

    if (!favorite) {
      this.profiles.update((list) => list.filter((p) => p.id !== profileId));
    }
  }
}

import { effect, inject, Injectable, signal } from '@angular/core';

import { FavoritesApiService } from '@infrastructure/api/favorites/favorites.api.service';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly api = inject(FavoritesApiService);
  private readonly auth = inject(AuthService);

  readonly favoriteIds = signal<ReadonlySet<number>>(new Set());
  readonly profiles = signal<ProfileSummary[]>([]);
  readonly isLoading = signal(false);

  private initializing: Promise<void> | null = null;
  private currentUserId: number | null = null;

  constructor() {
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
        const list = await this.api.getMyFavorites();
        this.profiles.set(list);
        this.favoriteIds.set(new Set(list.map((p) => p.id)));
      } finally {
        this.isLoading.set(false);
        this.initializing = null;
      }
    })();
    return this.initializing;
  }

  async toggle(profileId: number): Promise<void> {
    const wasFavorite = this.favoriteIds().has(profileId);
    const removedProfile = this.profiles().find((p) => p.id === profileId);

    this.applyFavorite(profileId, !wasFavorite);

    try {
      if (wasFavorite) await this.api.unfavorite(profileId);
      else await this.api.favorite(profileId);
    } catch {
      this.applyFavorite(profileId, wasFavorite);
      if (wasFavorite && removedProfile) {
        this.profiles.update((list) =>
          list.some((p) => p.id === removedProfile.id) ? list : [removedProfile, ...list]
        );
      }
    }
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

import { effect, inject, Injectable, signal } from '@angular/core';

import { BlockApiService } from '@infrastructure/api/block/block.api.service';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class BlockService {
  private readonly api = inject(BlockApiService);
  private readonly auth = inject(AuthService);

  readonly blockedIds = signal<ReadonlySet<number>>(new Set());
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
        const list = await this.api.getMyBlocked();
        this.profiles.set(list);
        this.blockedIds.set(new Set(list.map((p) => p.id)));
      } finally {
        this.isLoading.set(false);
        this.initializing = null;
      }
    })();
    return this.initializing;
  }

  async toggle(profileId: number): Promise<void> {
    const wasBlocked = this.blockedIds().has(profileId);
    const removedProfile = this.profiles().find((p) => p.id === profileId);

    this.applyBlock(profileId, !wasBlocked);

    try {
      if (wasBlocked) await this.api.unblock(profileId);
      else await this.api.block(profileId);
    } catch {
      this.applyBlock(profileId, wasBlocked);
      if (wasBlocked && removedProfile) {
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
    this.blockedIds.set(new Set());
    this.profiles.set([]);
  }

  private applyBlock(profileId: number, blocked: boolean): void {
    this.blockedIds.update((set) => {
      const next = new Set(set);
      if (blocked) next.add(profileId);
      else next.delete(profileId);
      return next;
    });

    if (!blocked) {
      this.profiles.update((list) => list.filter((p) => p.id !== profileId));
    }
  }
}

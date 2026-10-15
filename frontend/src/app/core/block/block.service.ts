import { effect, inject, Injectable, signal } from '@angular/core';

import { BlockApiService } from '@infrastructure/api/block/block.api.service';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockEvents } from '@core/block/block-events';

const MAX_REFRESH_ATTEMPTS = 3;

@Injectable({
  providedIn: 'root',
})
export class BlockService {
  private readonly api = inject(BlockApiService);
  private readonly auth = inject(AuthService);
  private readonly events = inject(BlockEvents);

  readonly blockedIds = signal<ReadonlySet<number>>(new Set());
  readonly profiles = signal<ProfileSummary[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal(false);

  private initializing: Promise<void> | null = null;
  private readonly pending = new Set<number>();
  private version = 0;
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
        for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt++) {
          const startedAt = this.version;
          const list = await this.api.getMyBlocked();
          if (this.version !== startedAt && attempt < MAX_REFRESH_ATTEMPTS) continue;
          this.applyServerList(list);
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

  async toggle(profileId: number): Promise<boolean> {
    if (this.pending.has(profileId)) return false;
    this.pending.add(profileId);
    this.version++;
    const wasBlocked = this.blockedIds().has(profileId);
    const removedProfile = this.profiles().find((p) => p.id === profileId);

    this.applyBlock(profileId, !wasBlocked);

    try {
      if (wasBlocked) await this.api.unblock(profileId);
      else await this.api.block(profileId);
      this.events.emit({ profileId, blocked: !wasBlocked });
      return true;
    } catch {
      this.applyBlock(profileId, wasBlocked);
      if (wasBlocked && removedProfile) {
        this.profiles.update((list) =>
          list.some((p) => p.id === removedProfile.id) ? list : [removedProfile, ...list]
        );
      }
      return false;
    } finally {
      this.pending.delete(profileId);
      this.version++;
    }
  }

  markBlocked(profileId: number): void {
    this.version++;
    this.applyBlock(profileId, true);
    this.events.emit({ profileId, blocked: true });
  }

  private applyServerList(list: ProfileSummary[]): void {
    const current = this.blockedIds();
    const ids = new Set(list.map((p) => p.id));
    const profiles = list.filter((p) => !this.pending.has(p.id) || current.has(p.id));
    for (const id of this.pending) {
      if (!current.has(id)) {
        ids.delete(id);
        continue;
      }
      ids.add(id);
      const existing = this.profiles().find((p) => p.id === id);
      if (existing && !profiles.some((p) => p.id === id)) profiles.unshift(existing);
    }
    this.profiles.set(profiles);
    this.blockedIds.set(ids);
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

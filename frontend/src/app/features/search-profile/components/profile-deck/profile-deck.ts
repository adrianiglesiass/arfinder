import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { ProfileSummary } from '@core/api/api.models';
import { ProfileSearchService } from '@core/profile-search/profile-search.service';
import { ProfileService } from '@core/profile/profile.service';

import { Button } from '@shared/components/button/button';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { IconButton } from '@shared/components/icon-button/icon-button';

import { ProfileDeckCard } from '@features/search-profile/components/profile-deck-card/profile-deck-card';

const SWIPE_THRESHOLD_PX = 110;
const FLY_DURATION_MS = 300;
const TAP_TOLERANCE_PX = 8;
const PREFETCH_AHEAD = 3;

interface DeckCard {
  profile: ProfileSummary;
  pos: number;
}

@Component({
  selector: 'app-profile-deck',
  imports: [Button, EmptyState, IconButton, ProfileDeckCard],
  templateUrl: './profile-deck.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onKey($event)' },
})
export class ProfileDeck {
  private readonly search = inject(ProfileSearchService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly isLoading = this.search.isLoading;
  protected readonly error = this.search.error;
  protected readonly hasActiveFilters = this.search.hasActiveFilters;
  private readonly profiles = this.search.profiles;

  protected readonly index = this.search.deckIndex;
  protected readonly photoIndex = signal(0);
  protected readonly dragX = signal(0);
  protected readonly dragging = signal(false);
  protected readonly flying = signal<'left' | 'right' | null>(null);
  protected readonly entering = signal(false);
  private get busy(): boolean {
    return this.flying() !== null || this.entering();
  }

  protected readonly total = computed(() => this.profiles().length);
  protected readonly position = computed(() => Math.min(this.index() + 1, this.total()));
  protected readonly remaining = computed(() => this.total() - this.index());
  protected readonly canGoBack = computed(() => this.index() > 0);
  protected readonly canGoNext = computed(() => this.index() < this.total() - 1);

  protected readonly isEmpty = computed(
    () => !this.isLoading() && !this.error() && this.total() === 0
  );
  protected readonly exhausted = computed(
    () => !this.isLoading() && this.total() > 0 && this.index() >= this.total()
  );

  protected readonly cards = computed<DeckCard[]>(() => {
    const list = this.profiles();
    const start = this.index();
    const out: DeckCard[] = [];
    for (let pos = 0; pos < 3; pos++) {
      const profile = list[start + pos];
      if (profile) out.push({ profile, pos });
    }
    return out;
  });

  private startX = 0;
  private startY = 0;
  private moved = false;

  private photosOf(p: ProfileSummary): string[] {
    return p.photo_urls ?? [];
  }

  protected cardTransform(pos: number): string {
    if (pos !== 0) {
      const scale = pos === 1 ? 0.94 : 0.88;
      const y = pos === 1 ? 18 : 34;
      return `translateY(${y}px) scale(${scale})`;
    }
    const fly = this.flying();
    if (fly === 'left') return 'translate3d(-140%, 0, 0) rotate(-18deg)';
    if (fly === 'right') return 'translate3d(140%, 0, 0) rotate(18deg)';
    const dx = this.dragX();
    if (dx === 0 && !this.dragging()) return 'none';
    return `translate3d(${dx}px, 0, 0) rotate(${dx * 0.05}deg)`;
  }

  protected cardTransition(pos: number): string {
    if (pos === 0 && (this.dragging() || this.entering())) return 'none';
    return `transform ${FLY_DURATION_MS}ms cubic-bezier(0.28, 0.11, 0.32, 1), opacity ${FLY_DURATION_MS}ms ease`;
  }

  protected cardOpacity(pos: number): number {
    if (pos === 0) return this.flying() ? 0 : 1;
    return pos === 1 ? 1 : 0.55;
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.busy) return;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.moved = false;
    this.dragging.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    if (Math.abs(dx) > TAP_TOLERANCE_PX || Math.abs(dy) > TAP_TOLERANCE_PX) this.moved = true;
    this.dragX.set(dx);
  }

  protected onPointerUp(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const dx = this.dragX();
    if (dx <= -SWIPE_THRESHOLD_PX) {
      this.next();
    } else if (dx >= SWIPE_THRESHOLD_PX) {
      this.dragX.set(0);
      this.prev();
    } else {
      this.dragX.set(0);
    }
  }

  private fly(dir: 'left' | 'right'): void {
    if (this.index() >= this.total()) {
      this.dragX.set(0);
      return;
    }
    this.flying.set(dir);
    setTimeout(() => {
      this.index.update((i) => i + 1);
      this.photoIndex.set(0);
      this.dragX.set(0);
      this.flying.set(null);
      this.maybeLoadMore();
    }, FLY_DURATION_MS);
  }

  protected next(): void {
    if (this.busy) return;
    if (this.index() >= this.total() - 1 && this.search.hasMore()) {
      void this.search.loadMore();
      this.dragX.set(0);
      return;
    }
    this.fly('left');
  }

  protected prev(): void {
    if (this.busy || this.index() === 0) return;
    this.dragX.set(0);
    this.index.update((i) => i - 1);
    this.photoIndex.set(0);
    this.entering.set(true);
    setTimeout(() => this.entering.set(false), FLY_DURATION_MS);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.next();
    else if (event.key === 'ArrowLeft') this.prev();
  }

  protected photoPrev(p: ProfileSummary, event: Event): void {
    event.stopPropagation();
    const n = this.photosOf(p).length;
    if (n <= 1) return;
    this.photoIndex.update((i) => (i - 1 + n) % n);
  }

  protected photoNext(p: ProfileSummary, event: Event): void {
    event.stopPropagation();
    const n = this.photosOf(p).length;
    if (n <= 1) return;
    this.photoIndex.update((i) => (i + 1) % n);
  }

  protected openProfile(p: ProfileSummary): void {
    if (this.moved) {
      this.moved = false;
      return;
    }
    void this.router.navigate(['/perfil', p.id]);
  }

  protected prefetch(p: ProfileSummary): void {
    this.profileService.prefetchProfileById(p.id);
  }

  private maybeLoadMore(): void {
    if (this.remaining() <= PREFETCH_AHEAD && this.search.hasMore()) {
      void this.search.loadMore();
    }
  }

  protected retry(): void {
    this.search.retry();
  }

  protected reset(): void {
    this.index.set(0);
    this.search.reset();
  }
}

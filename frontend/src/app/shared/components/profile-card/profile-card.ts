import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ProfileSummary, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { ProfileService } from '@core/profile/profile.service';

import { ProfileBadge } from '@shared/components/profile-badge/profile-badge';

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

const SWIPE_DISTANCE_THRESHOLD = 40;

@Component({
  selector: 'app-profile-card',
  imports: [NgClass, ProfileBadge, RouterLink],
  templateUrl: './profile-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCard {
  profile = input.required<ProfileSummary>();

  private readonly profileService = inject(ProfileService);

  protected readonly activeIndex = signal(0);

  protected readonly photos = computed(() => this.profile().photo_urls ?? []);
  protected readonly hasPhotos = computed(() => this.photos().length > 0);
  protected readonly hasMultiple = computed(() => this.photos().length > 1);
  protected readonly currentPhoto = computed(() => this.photos()[this.activeIndex()] ?? null);

  protected readonly typeLabel = computed(() => TYPE_LABELS[this.profile().type]);
  protected readonly scheduleLabel = computed(() => {
    const schedule = this.profile().schedule;
    return schedule ? SCHEDULE_LABELS[schedule] : null;
  });

  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private suppressNextClick = false;

  protected onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      this.touchStartX = null;
      return;
    }
    const t = event.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null || this.touchStartY === null) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    this.touchStartX = null;
    this.touchStartY = null;

    if (Math.abs(dx) < SWIPE_DISTANCE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (!this.hasMultiple()) return;

    if (event.cancelable) event.preventDefault();
    this.suppressNextClick = true;
    const total = this.photos().length;
    if (dx > 0) this.activeIndex.update((i) => (i - 1 + total) % total);
    else this.activeIndex.update((i) => (i + 1) % total);
  }

  protected onTouchCancel(): void {
    this.touchStartX = null;
    this.touchStartY = null;
  }

  protected onCardClick(event: MouseEvent): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  protected prev(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const total = this.photos().length;
    if (total <= 1) return;
    this.activeIndex.update((i) => (i - 1 + total) % total);
  }

  protected next(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const total = this.photos().length;
    if (total <= 1) return;
    this.activeIndex.update((i) => (i + 1) % total);
  }

  protected goTo(index: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeIndex.set(index);
  }

  protected onPrefetchHint(): void {
    this.profileService.prefetchProfileById(this.profile().id);
  }
}

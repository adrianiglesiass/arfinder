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

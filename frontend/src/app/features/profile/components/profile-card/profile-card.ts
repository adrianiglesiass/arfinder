import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ProfileSummary } from '@core/api/api.models';
import { ProfileService } from '@core/profile/profile.service';

import { ProfileBadge } from '@shared/components/profile-badge/profile-badge';
import { ProfilePhoto } from '@shared/components/profile-photo/profile-photo';

import { SCHEDULE_LABELS, TYPE_LABELS } from '@features/profile/profile-labels';

@Component({
  selector: 'app-profile-card',
  imports: [RouterLink, ProfileBadge, ProfilePhoto],
  templateUrl: './profile-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCard {
  readonly profile = input.required<ProfileSummary>();

  private readonly profileService = inject(ProfileService);

  protected readonly photo = computed(() => this.profile().photo_urls?.[0] ?? null);
  protected readonly typeLabel = computed(() => TYPE_LABELS[this.profile().type]);
  protected readonly scheduleLabel = computed(() => {
    const schedule = this.profile().schedule;
    return schedule ? SCHEDULE_LABELS[schedule] : null;
  });

  protected prefetch(): void {
    this.profileService.prefetchProfileById(this.profile().id);
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { ProfileSummary } from '@core/api/api.models';

import { ProfilePhoto } from '@shared/components/profile-photo/profile-photo';

import { SCHEDULE_LABELS, TYPE_LABELS } from '@features/profile/profile-labels';

@Component({
  selector: 'app-profile-deck-card',
  imports: [ProfilePhoto],
  templateUrl: './profile-deck-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDeckCard {
  readonly profile = input.required<ProfileSummary>();
  readonly active = input(false);
  readonly photoIndex = input(0);

  readonly photoPrev = output<Event>();
  readonly photoNext = output<Event>();

  protected readonly photos = computed(() => this.profile().photo_urls ?? []);
  protected readonly hasMultiple = computed(() => this.photos().length > 1);
  protected readonly typeLabel = computed(() => TYPE_LABELS[this.profile().type]);
  protected readonly scheduleLabel = computed(() => {
    const schedule = this.profile().schedule;
    return schedule ? SCHEDULE_LABELS[schedule] : null;
  });
  protected readonly currentPhoto = computed(() => {
    const photos = this.photos();
    if (!photos.length) return null;
    const i = this.active() ? this.photoIndex() : 0;
    return photos[i] ?? photos[0];
  });
}

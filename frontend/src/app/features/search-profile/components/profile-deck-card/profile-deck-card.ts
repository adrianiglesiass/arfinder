import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { ProfileSummary } from '@core/api/api.models';

import { FavoriteButton } from '@shared/components/favorite-button/favorite-button';
import { ProfilePhoto } from '@shared/components/profile-photo/profile-photo';

import { SCHEDULE_LABELS, TYPE_LABELS } from '@features/profile/profile-labels';

@Component({
  selector: 'app-profile-deck-card',
  imports: [ProfilePhoto, FavoriteButton],
  templateUrl: './profile-deck-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDeckCard {
  readonly profile = input.required<ProfileSummary>();
  readonly active = input(false);
  readonly photoIndex = input(0);

  readonly photoPrev = output<Event>();
  readonly photoNext = output<Event>();
  readonly opened = output<void>();

  protected open(event: Event): void {
    // The parent card also opens the profile on click; stop here so it only happens once.
    event.stopPropagation();
    this.opened.emit();
  }

  protected readonly photos = computed(() => this.profile().photo_urls ?? []);
  protected readonly secondaryPhotos = computed(() => this.photos().slice(1));
  protected readonly hasMultiple = computed(() => this.photos().length > 1);
  protected readonly typeLabel = computed(() => TYPE_LABELS[this.profile().type]);
  protected readonly scheduleLabel = computed(() => {
    const schedule = this.profile().schedule;
    return schedule ? SCHEDULE_LABELS[schedule] : null;
  });
}

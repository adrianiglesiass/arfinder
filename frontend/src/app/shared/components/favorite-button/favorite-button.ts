import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { FavoritesService } from '@core/favorites/favorites.service';

@Component({
  selector: 'app-favorite-button',
  templateUrl: './favorite-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class FavoriteButton {
  private readonly favorites = inject(FavoritesService);

  readonly profileId = input.required<number>();

  protected readonly isFavorite = computed(() =>
    this.favorites.favoriteIds().has(this.profileId())
  );

  protected toggle(event: Event): void {
    event.stopPropagation();
    void this.favorites.toggle(this.profileId());
  }
}

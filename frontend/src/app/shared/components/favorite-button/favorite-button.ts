import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ROUTES } from '@core/constants/routes';
import { FavoritesService } from '@core/favorites/favorites.service';

export type FavoriteButtonAppearance = 'overlay' | 'outline';

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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly profileId = input.required<number>();
  readonly appearance = input<FavoriteButtonAppearance>('overlay');

  protected readonly isFavorite = computed(() =>
    this.favorites.favoriteIds().has(this.profileId())
  );

  protected readonly appearanceClasses = computed(() =>
    this.appearance() === 'outline'
      ? 'w-10 h-10 border border-gray-border bg-white hover:border-red-200'
      : 'w-11 h-11 bg-white/90 backdrop-blur-sm shadow-md hover:scale-105'
  );

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (!this.auth.currentUser()) {
      void this.router.navigate([ROUTES.LOGIN], { queryParams: { redirect: this.router.url } });
      return;
    }
    void this.favorites.toggle(this.profileId());
  }
}

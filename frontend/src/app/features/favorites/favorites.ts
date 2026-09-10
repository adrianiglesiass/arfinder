import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ROUTES } from '@core/constants/routes';
import { FavoritesService } from '@core/favorites/favorites.service';

import { EmptyState } from '@shared/components/empty-state/empty-state';

import { ProfileCard } from '@features/profile/components/profile-card/profile-card';

@Component({
  selector: 'app-favorites',
  imports: [ProfileCard, EmptyState, RouterLink],
  templateUrl: './favorites.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Favorites implements OnInit {
  private readonly favorites = inject(FavoritesService);

  protected readonly isLoading = this.favorites.isLoading;
  protected readonly visibleProfiles = computed(() =>
    this.favorites.profiles().filter((p) => this.favorites.favoriteIds().has(p.id))
  );

  protected readonly exploreLink = ROUTES.EXPLORE;

  ngOnInit(): void {
    void this.favorites.refresh();
  }
}

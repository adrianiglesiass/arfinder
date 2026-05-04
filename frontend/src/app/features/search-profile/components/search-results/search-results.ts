import { Component, inject } from '@angular/core';

import { ProfileSearchService } from '@core/profileSearch/profile-search.service';

import { Button } from '@shared/components/button/button';
import { ProfileCard } from '@shared/components/profile-card/profile-card';

@Component({
  selector: 'app-search-results',
  imports: [ProfileCard, Button],
  templateUrl: './search-results.html',
})
export class SearchResults {
  private readonly searchService = inject(ProfileSearchService);

  readonly resource = this.searchService.resource;

  retry() {
    this.resource.reload();
  }
}

import { inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { CityApiService } from '@infrastructure/api/city/city.api.service';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CitySearchService {
  private cityService = inject(CityApiService);
  private searchQuery = signal<string>('');

  cityResource = rxResource({
    params: () => this.searchQuery(),
    stream: ({ params: query }) => {
      if (query.length < 2) return of([]);
      return this.cityService.searchCities(query);
    },
  });

  onCitySearch(event: { query: string }) {
    this.searchQuery.set(event.query);
  }

  reset() {
    this.searchQuery.set('');
  }
}

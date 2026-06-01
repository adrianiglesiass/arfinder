import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { CityApiService } from '@infrastructure/api/city/city.api.service';
import { debounceTime, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CitySearchService {
  private cityService = inject(CityApiService);
  private searchQuery = signal<string>('');
  private extendedQuery = signal<string>('');

  private debouncedQuery = toSignal(toObservable(this.searchQuery).pipe(debounceTime(250)), {
    initialValue: '',
  });

  cityResource = rxResource({
    params: () => this.debouncedQuery(),
    stream: ({ params: query }) => {
      if (query.length < 2) return of([]);
      return this.cityService.searchCities(query);
    },
  });

  extendedResource = rxResource({
    params: () => this.extendedQuery(),
    stream: ({ params: query }) => {
      if (query.length < 3) return of([]);
      return this.cityService.searchCitiesExtended(query);
    },
  });

  readonly suggestions = computed(() => {
    const extended = this.extendedResource.value() ?? [];
    if (extended.length) return extended;
    return this.cityResource.value() ?? [];
  });

  readonly hasLocalResults = computed(() => (this.cityResource.value() ?? []).length > 0);
  readonly isExtendedLoading = computed(() => this.extendedResource.isLoading());

  onCitySearch(event: { query: string }) {
    this.searchQuery.set(event.query);
    this.extendedQuery.set('');
  }

  searchExtended(query: string) {
    this.extendedQuery.set(query);
  }

  reset() {
    this.searchQuery.set('');
    this.extendedQuery.set('');
  }
}

import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CityService } from '@infrastructure/api/city.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { of } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [AutoCompleteModule],
  templateUrl: './search.html',
})
export class Search {
  private cityService = inject(CityService);
  searchQuery = signal<string>('');

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
}

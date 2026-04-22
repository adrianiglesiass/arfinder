import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';

import { CitySearchService } from '@core/location/city-search.service';

@Component({
  selector: 'app-search',
  imports: [AutoCompleteModule, FormsModule],
  templateUrl: './search.html',
})
export class Search {
  protected readonly citySearchService = inject(CitySearchService);

  readonly city = input<string>('');
  readonly citySelected = output<string>();

  protected readonly value = signal<string>('');

  citySuggestions = computed(() => this.citySearchService.cityResource.value() ?? []);

  constructor() {
    effect(() => {
      this.value.set(this.city());
    });
  }

  onCitySearch(event: { query: string }) {
    this.citySearchService.onCitySearch(event);
  }

  onCitySelect(city: string) {
    this.value.set(city);
    this.citySelected.emit(city);
  }
}

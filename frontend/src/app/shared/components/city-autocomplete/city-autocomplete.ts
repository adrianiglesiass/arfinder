import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';

import { CitySearchService } from '@core/location/city-search.service';

@Component({
  selector: 'app-city-autocomplete',
  imports: [AutoCompleteModule, FormsModule],
  templateUrl: './city-autocomplete.html',
})
export class CityAutocomplete {
  protected readonly citySearchService = inject(CitySearchService);

  readonly city = input<string>('');
  readonly citySelected = output<string>();

  protected readonly value = signal<string>('');

  citySuggestions = computed(() =>
    this.value().trim().length < 2 ? [] : this.citySearchService.suggestions()
  );

  constructor() {
    effect(() => {
      this.value.set(this.city());
    });
  }

  onCitySearch(event: { query: string }) {
    this.citySearchService.onCitySearch(event);
  }

  onKeyUp(event: KeyboardEvent) {
    const query = (event.target as HTMLInputElement).value ?? '';
    if (query.trim().length < 2) {
      this.citySearchService.reset();
    }
  }

  onClear() {
    this.citySearchService.reset();
  }

  onSearchMore() {
    this.citySearchService.searchExtended(this.value());
  }

  onCitySelect(city: string) {
    this.value.set(city);
    this.citySelected.emit(city);
  }
}

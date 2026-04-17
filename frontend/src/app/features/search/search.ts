import { Component, computed, inject, input, output } from '@angular/core';
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
  initialCity = input<string>('');
  citySelected = output<string>();

  citySuggestions = computed(() => this.citySearchService.cityResource.value() ?? []);

  constructor() {
    if (this.initialCity()) {
      this.citySearchService.selectCity(this.initialCity());
    }
  }

  onCitySearch(event: { query: string }) {
    this.citySearchService.onCitySearch(event);
  }

  onCitySelect(city: string) {
    this.citySearchService.selectCity(city);
    this.citySelected.emit(city);
  }
}

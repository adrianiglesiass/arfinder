import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CitySearchService } from '@infrastructure/services/city-search.service';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-search',
  imports: [AutoCompleteModule, FormsModule],
  templateUrl: './search.html',
})
export class Search {
  protected citySearchService = inject(CitySearchService);
  initialCity = input<string>('');
  citySelected = output<string>();

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

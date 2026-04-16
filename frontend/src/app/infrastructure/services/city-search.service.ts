import { inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { CityService } from '@infrastructure/api/city/city.service';
import { of } from 'rxjs';

const SELECTED_CITY_KEY = 'arfinder_selected_city';

@Injectable({
  providedIn: 'root',
})
export class CitySearchService {
  private cityService = inject(CityService);
  private searchQuery = signal<string>('');
  selectedCity = signal<string>(this.loadSelectedCity());

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

  selectCity(city: string) {
    this.selectedCity.set(city);
    this.saveSelectedCity(city);
  }

  private saveSelectedCity(city: string): void {
    try {
      localStorage.setItem(SELECTED_CITY_KEY, city);
    } catch (error) {
      console.error('Error saving selected city:', error);
    }
  }

  private loadSelectedCity(): string {
    try {
      return localStorage.getItem(SELECTED_CITY_KEY) || '';
    } catch (error) {
      console.error('Error loading selected city:', error);
      return '';
    }
  }

  reset() {
    this.searchQuery.set('');
  }

  clearSelectedCity() {
    this.selectedCity.set('');
    try {
      localStorage.removeItem(SELECTED_CITY_KEY);
    } catch (error) {
      console.error('Error clearing selected city:', error);
    }
  }
}

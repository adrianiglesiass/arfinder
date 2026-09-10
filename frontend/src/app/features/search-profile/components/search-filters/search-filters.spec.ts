import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { vi } from 'vitest';

import type { ProfileSearchFilters } from '@core/api/api.models';
import { CitySearchService } from '@core/location/city-search.service';
import { ProfileSearchService } from '@core/profile-search/profile-search.service';

import { SearchFilters } from './search-filters';

describe('SearchFilters — filtros de edad y género', () => {
  let fixture: ComponentFixture<SearchFilters>;
  let component: SearchFilters;
  let updateFilter: ReturnType<typeof vi.fn>;
  let reset: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    updateFilter = vi.fn();
    reset = vi.fn();

    const filters = signal<ProfileSearchFilters>({});
    const citiesMock = {
      suggestions: signal<string[]>([]),
      isExtendedLoading: signal(false),
      cityResource: { isLoading: signal(false), error: signal(null) },
      onCitySearch: vi.fn(),
      searchExtended: vi.fn(),
      reset: vi.fn(),
    } as unknown as CitySearchService;

    await TestBed.configureTestingModule({
      imports: [SearchFilters],
      providers: [
        {
          provide: ProfileSearchService,
          useValue: { filters, updateFilter, reset },
        },
        { provide: CitySearchService, useValue: citiesMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('selecciona un género y avisa al servicio de búsqueda', () => {
    component.setGender('Mujer');
    expect(updateFilter).toHaveBeenCalledWith('gender', 'Mujer');
  });

  it('deselecciona un género con null', () => {
    component.setGender(null);
    expect(updateFilter).toHaveBeenCalledWith('gender', null);
  });

  it('actualiza edad mínima y máxima por separado', () => {
    component.setAgeMin(25);
    expect(updateFilter).toHaveBeenCalledWith('age_min', 25);

    component.setAgeMax(35);
    expect(updateFilter).toHaveBeenCalledWith('age_max', 35);
  });

  it('expone los límites de edad para la UI', () => {
    expect(component.ageMinLimit).toBe(18);
    expect(component.ageMaxLimit).toBe(99);
  });
});

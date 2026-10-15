import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RightPanelService } from '@layout/right-panel.service';
import { vi } from 'vitest';

import type { ProfileSearchFilters } from '@core/api/api.models';
import { ProfileSearchService } from '@core/profile-search/profile-search.service';

import SearchProfile from './search-profile';

describe('SearchProfile — chips de filtros activos', () => {
  const chipsFor = (value: ProfileSearchFilters) => {
    const filters = signal<ProfileSearchFilters>(value);
    TestBed.configureTestingModule({
      providers: [
        { provide: RightPanelService, useValue: { set: vi.fn(), clear: vi.fn() } },
        {
          provide: ProfileSearchService,
          useValue: {
            filters,
            isLoading: signal(false),
            hasMore: signal(false),
            profiles: signal([]),
            updateFilter: vi.fn(),
          },
        },
      ],
    });
    TestBed.overrideComponent(SearchProfile, { set: { imports: [], template: '' } });
    const component = TestBed.createComponent(SearchProfile).componentInstance;
    return component['activeChips']().map((chip) => chip.label);
  };

  it('el presupuesto mínimo se muestra como "Presupuesto desde"', () => {
    expect(chipsFor({ budget_min: 600 })).toEqual(['Presupuesto desde 600 €']);
  });

  it('el precio máximo se muestra como "Precio hasta"', () => {
    expect(chipsFor({ budget_max: 600 })).toEqual(['Precio hasta 600 €']);
  });
});

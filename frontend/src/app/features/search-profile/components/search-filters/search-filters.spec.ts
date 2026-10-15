import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { vi } from 'vitest';

import type { ProfileResponse, ProfileSearchFilters, TypeEnum } from '@core/api/api.models';
import { CitySearchService } from '@core/location/city-search.service';
import { ProfileSearchService } from '@core/profile-search/profile-search.service';
import { ProfileService } from '@core/profile/profile.service';

import { SearchFilters } from './search-filters';

describe('SearchFilters — controles del panel de filtros', () => {
  let fixture: ComponentFixture<SearchFilters>;
  let component: SearchFilters;
  let updateFilter: ReturnType<typeof vi.fn>;
  let updateFilters: ReturnType<typeof vi.fn>;
  let reset: ReturnType<typeof vi.fn>;
  let filters: ReturnType<typeof signal<ProfileSearchFilters>>;
  let currentProfile: ReturnType<typeof signal<ProfileResponse | null>>;

  const viewerIs = (type: TypeEnum) => {
    currentProfile.set({ type } as ProfileResponse);
    fixture.detectChanges();
  };
  const budgetLabel = () =>
    (fixture.nativeElement as HTMLElement)
      .querySelector(`#${component['ids'].budget}`)!
      .textContent!.trim();

  beforeEach(async () => {
    updateFilter = vi.fn();
    updateFilters = vi.fn();
    reset = vi.fn();

    filters = signal<ProfileSearchFilters>({});
    currentProfile = signal<ProfileResponse | null>(null);
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
          useValue: { filters, updateFilter, updateFilters, reset },
        },
        { provide: ProfileService, useValue: { currentProfile } },
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

  it('establece la fecha de disponibilidad', () => {
    component.setAvailableFrom('2026-10-01');
    expect(updateFilter).toHaveBeenCalledWith('available_from', '2026-10-01');
  });

  it('borra la fecha de disponibilidad cuando se vacía el campo', () => {
    component.setAvailableFrom('');
    expect(updateFilter).toHaveBeenCalledWith('available_from', null);
  });

  describe('presupuesto según quién busca', () => {
    it('quien ofrece habitación filtra por presupuesto mínimo de quien busca piso', () => {
      viewerIs('looking_for_roommate');
      expect(budgetLabel()).toBe('Presupuesto mínimo');

      component.onBudgetSlide(600);
      component.commitBudget();

      expect(updateFilters).toHaveBeenCalledWith({ budget_min: 600, budget_max: null });
    });

    it('quien busca piso filtra por precio máximo de la habitación', () => {
      viewerIs('looking_for_flat');
      expect(budgetLabel()).toBe('Precio máx. habitación');

      component.onBudgetSlide(600);
      component.commitBudget();

      expect(updateFilters).toHaveBeenCalledWith({ budget_max: 600, budget_min: null });
    });

    it('el tipo elegido en "¿Qué busca?" manda sobre el perfil propio', () => {
      viewerIs('looking_for_flat');
      filters.set({ profile_type: 'looking_for_flat' });
      fixture.detectChanges();

      expect(budgetLabel()).toBe('Presupuesto mínimo');
    });

    it('en sentido mínimo el extremo izquierdo es "Sin mínimo" y no filtra', () => {
      viewerIs('looking_for_roommate');
      expect(component.budgetSliderValue()).toBe(200);
      expect(fixture.nativeElement.textContent).toContain('Sin mínimo');

      component.commitBudget();

      expect(updateFilters).toHaveBeenCalledWith({ budget_min: null, budget_max: null });
    });

    it('en sentido máximo el extremo derecho es "Sin límite" y no filtra', () => {
      viewerIs('looking_for_flat');
      expect(component.budgetSliderValue()).toBe(1500);
      expect(fixture.nativeElement.textContent).toContain('Sin límite');

      component.commitBudget();

      expect(updateFilters).toHaveBeenCalledWith({ budget_max: null, budget_min: null });
    });

    it('cambiar a un tipo del otro sentido traslada el importe al otro parámetro', () => {
      filters.set({ budget_max: 600 });
      fixture.detectChanges();

      component.setType('looking_for_flat');

      expect(updateFilters).toHaveBeenCalledWith({
        profile_type: 'looking_for_flat',
        budget_min: 600,
        budget_max: null,
      });
      expect(updateFilter).not.toHaveBeenCalled();
    });

    it('si el perfil propio llega tarde, el slider pasa al extremo neutro del nuevo sentido', () => {
      expect(component.budgetSliderValue()).toBe(1500);

      viewerIs('looking_for_roommate');

      expect(component.budgetSliderValue()).toBe(200);
      expect(fixture.nativeElement.textContent).toContain('Sin mínimo');
    });

    it('sin tipo elegido avisa del tipo que se elegirá al fijar el importe', () => {
      viewerIs('looking_for_roommate');
      expect(fixture.nativeElement.textContent).toContain(
        'Al fijarlo verás solo perfiles que buscan piso'
      );

      viewerIs('looking_for_flat');
      expect(fixture.nativeElement.textContent).toContain('Al fijarlo verás solo habitaciones');

      filters.set({ profile_type: 'looking_for_flat' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Al fijarlo');
      expect(fixture.nativeElement.textContent).not.toContain('Pensado para');
    });

    it('un importe en el extremo neutro del nuevo sentido deja de filtrar', () => {
      filters.set({ budget_max: 200 });
      fixture.detectChanges();

      component.setType('looking_for_flat');

      expect(updateFilters).toHaveBeenCalledWith({
        profile_type: 'looking_for_flat',
        budget_min: null,
        budget_max: null,
      });
    });

    it('cambiar de tipo sin importe, o sin cambiar de sentido, solo cambia el tipo', () => {
      component.setType('looking_for_roommate');
      expect(updateFilter).toHaveBeenCalledWith('profile_type', 'looking_for_roommate');

      filters.set({ budget_max: 600 });
      fixture.detectChanges();
      component.setType('looking_for_roommate');
      expect(updateFilters).not.toHaveBeenCalled();
    });
  });

  it('etiqueta cada control y agrupa los chips', () => {
    const el: HTMLElement = fixture.nativeElement;
    for (const label of Array.from(el.querySelectorAll('label[for]'))) {
      const id = label.getAttribute('for')!;
      expect(el.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(el.querySelector('[aria-label="Edad mínima"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Edad máxima"]')).not.toBeNull();
    const groups = Array.from(el.querySelectorAll('[role="group"][aria-labelledby]'));
    expect(groups.length).toBeGreaterThanOrEqual(6);
    for (const group of groups) {
      expect(el.querySelector(`#${group.getAttribute('aria-labelledby')}`)).not.toBeNull();
    }
  });

  it('no repite ids entre dos instancias del panel', () => {
    const other = TestBed.createComponent(SearchFilters);
    other.detectChanges();
    const ids = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('[id]')).map((node) => node.id);
    const shared = ids(fixture.nativeElement).filter((id) => ids(other.nativeElement).includes(id));
    expect(shared).toEqual([]);
  });
});

import { TestBed } from '@angular/core/testing';

import { FavoritesApiService } from '@infrastructure/api/favorites/favorites.api.service';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';

import { FavoritesService } from './favorites.service';

describe('FavoritesService — toggle optimista', () => {
  let service: FavoritesService;
  let api: {
    favorite: ReturnType<typeof vi.fn>;
    unfavorite: ReturnType<typeof vi.fn>;
    getMyFavorites: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      favorite: vi.fn(() => Promise.resolve()),
      unfavorite: vi.fn(() => Promise.resolve()),
      getMyFavorites: vi.fn(() => Promise.resolve([])),
    };

    await TestBed.configureTestingModule({
      providers: [
        FavoritesService,
        { provide: FavoritesApiService, useValue: api },
        {
          provide: AuthService,
          useValue: { currentUser: vi.fn(() => null) } as unknown as AuthService,
        },
      ],
    }).compileComponents();

    service = TestBed.runInInjectionContext(() => TestBed.inject(FavoritesService));
  });

  it('marca un favorito de forma optimista', async () => {
    await service.toggle(42);
    expect(service.favoriteIds().has(42)).toBe(true);
    expect(api.favorite).toHaveBeenCalledWith(42);
  });

  it('desmarca un favorito existente', async () => {
    await service.toggle(42);
    await service.toggle(42);
    expect(service.favoriteIds().has(42)).toBe(false);
    expect(api.unfavorite).toHaveBeenCalledWith(42);
  });

  it('revierte el cambio si la API falla', async () => {
    api.favorite = vi.fn(() => Promise.reject(new Error('boom')));
    await service.toggle(42);
    expect(service.favoriteIds().has(42)).toBe(false);
    expect(api.favorite).toHaveBeenCalledWith(42);
  });
});

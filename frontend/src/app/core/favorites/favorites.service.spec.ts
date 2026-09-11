import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { FavoritesApiService } from '@infrastructure/api/favorites/favorites.api.service';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { BlockEvents } from '@core/block/block-events';

import { FavoritesService } from './favorites.service';

describe('FavoritesService — toggle optimista', () => {
  let service: FavoritesService;
  let api: {
    favorite: ReturnType<typeof vi.fn>;
    unfavorite: ReturnType<typeof vi.fn>;
    getMyFavorites: ReturnType<typeof vi.fn>;
  };

  let currentUserFn: ReturnType<typeof vi.fn>;

  const fav = (id: number) => ({
    id,
    user_id: id,
    name: `P${id}`,
    age: 30,
    city: 'Madrid',
    has_pets: false,
    is_smoker: false,
    type: 'looking_for_flat' as const,
    photo_urls: [],
  });

  beforeEach(async () => {
    currentUserFn = vi.fn(() => null);
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
          useValue: { currentUser: currentUserFn } as unknown as AuthService,
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

  it('al bloquear un perfil, lo quita de favoritos al instante', () => {
    service.favoriteIds.set(new Set([42, 7]));

    TestBed.inject(BlockEvents).emit({ profileId: 42, blocked: true });

    expect([...service.favoriteIds()]).toEqual([7]);
  });

  it('al desbloquear, no quita nada localmente', () => {
    service.favoriteIds.set(new Set([7]));

    TestBed.inject(BlockEvents).emit({ profileId: 42, blocked: false });

    expect([...service.favoriteIds()]).toEqual([7]);
  });

  it('ignora un segundo toque sobre el mismo perfil mientras hay uno en vuelo', async () => {
    let finish!: () => void;
    api.favorite = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));

    const first = service.toggle(42);
    await service.toggle(42);
    finish();
    await first;

    expect(api.favorite).toHaveBeenCalledTimes(1);
    expect(api.unfavorite).not.toHaveBeenCalled();
    expect(service.favoriteIds().has(42)).toBe(true);
  });

  it('un refresh que empezó antes de un toggle no lo deshace', async () => {
    currentUserFn.mockReturnValue({ id: 1 });
    let finishStale!: (list: ReturnType<typeof fav>[]) => void;
    api.getMyFavorites = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => (finishStale = resolve)))
      .mockResolvedValueOnce([fav(42)]);

    const refreshing = service.refresh();
    await service.toggle(42);
    finishStale([]);
    await refreshing;

    expect(service.favoriteIds().has(42)).toBe(true);
    expect(api.getMyFavorites).toHaveBeenCalledTimes(2);
  });

  it('un 409 al marcar significa que ya era favorito y no se revierte', async () => {
    api.favorite = vi.fn(() => Promise.reject(new HttpErrorResponse({ status: 409 })));

    await service.toggle(42);

    expect(service.favoriteIds().has(42)).toBe(true);
  });

  it('un refresh fallido marca el error sin rechazar', async () => {
    currentUserFn.mockReturnValue({ id: 1 });
    api.getMyFavorites = vi.fn(() => Promise.reject(new Error('red')));

    await expect(service.refresh()).resolves.toBeUndefined();

    expect(service.error()).toBe(true);
  });
});

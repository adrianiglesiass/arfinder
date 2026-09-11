import { TestBed } from '@angular/core/testing';

import { BlockApiService } from '@infrastructure/api/block/block.api.service';
import { vi } from 'vitest';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { FavoritesService } from '@core/favorites/favorites.service';
import { ProfileSearchService } from '@core/profile-search/profile-search.service';

import { BlockService } from './block.service';

const blockedProfile: ProfileSummary = {
  id: 42,
  user_id: 7,
  name: 'Bloqueada',
  age: 30,
  city: 'Madrid',
  has_pets: false,
  is_smoker: false,
  type: 'looking_for_flat',
  photo_urls: [],
};

describe('BlockService — toggle optimista', () => {
  let service: BlockService;
  let api: {
    block: ReturnType<typeof vi.fn>;
    unblock: ReturnType<typeof vi.fn>;
    getMyBlocked: ReturnType<typeof vi.fn>;
  };
  let favorites: { refresh: ReturnType<typeof vi.fn> };
  let search: { removeProfile: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      block: vi.fn(() => Promise.resolve()),
      unblock: vi.fn(() => Promise.resolve()),
      getMyBlocked: vi.fn(() => Promise.resolve([])),
    };
    favorites = { refresh: vi.fn(() => Promise.resolve()) };
    search = { removeProfile: vi.fn() };

    await TestBed.configureTestingModule({
      providers: [
        BlockService,
        { provide: BlockApiService, useValue: api },
        { provide: FavoritesService, useValue: favorites as unknown as FavoritesService },
        { provide: ProfileSearchService, useValue: search as unknown as ProfileSearchService },
        {
          provide: AuthService,
          useValue: { currentUser: vi.fn(() => null) } as unknown as AuthService,
        },
      ],
    }).compileComponents();

    service = TestBed.runInInjectionContext(() => TestBed.inject(BlockService));
  });

  it('bloquea un usuario de forma optimista', async () => {
    const ok = await service.toggle(42);
    expect(ok).toBe(true);
    expect(service.blockedIds().has(42)).toBe(true);
    expect(api.block).toHaveBeenCalledWith(42);
  });

  it('desbloquea un usuario existente', async () => {
    await service.toggle(42);
    await service.toggle(42);
    expect(service.blockedIds().has(42)).toBe(false);
    expect(api.unblock).toHaveBeenCalledWith(42);
  });

  it('revierte el cambio si la API falla', async () => {
    api.block = vi.fn(() => Promise.reject(new Error('boom')));
    const ok = await service.toggle(42);
    expect(ok).toBe(false);
    expect(service.blockedIds().has(42)).toBe(false);
    expect(api.block).toHaveBeenCalledWith(42);
  });

  it('restaura el perfil removido si falla el desbloqueo', async () => {
    api.unblock = vi.fn(() => Promise.reject(new Error('boom')));
    service.blockedIds.set(new Set([42]));
    service.profiles.set([blockedProfile]);

    await service.toggle(42);

    expect(service.blockedIds().has(42)).toBe(true);
    expect(service.profiles().map((p) => p.id)).toEqual([42]);
  });

  it('al bloquear, quita el perfil de la búsqueda y refresca favoritos', async () => {
    await service.toggle(42);
    await vi.waitFor(() => expect(favorites.refresh).toHaveBeenCalled());
    expect(search.removeProfile).toHaveBeenCalledWith(42);
  });

  it('al desbloquear, solo refresca favoritos', async () => {
    service.blockedIds.set(new Set([42]));
    await service.toggle(42);
    await vi.waitFor(() => expect(favorites.refresh).toHaveBeenCalled());
    expect(search.removeProfile).not.toHaveBeenCalled();
  });

  it('si la API falla, no sincroniza nada', async () => {
    api.block = vi.fn(() => Promise.reject(new Error('boom')));
    await service.toggle(42);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(favorites.refresh).not.toHaveBeenCalled();
    expect(search.removeProfile).not.toHaveBeenCalled();
  });
});

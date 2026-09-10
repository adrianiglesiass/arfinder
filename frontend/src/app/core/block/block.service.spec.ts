import { TestBed } from '@angular/core/testing';

import { BlockApiService } from '@infrastructure/api/block/block.api.service';
import { vi } from 'vitest';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

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

  beforeEach(async () => {
    api = {
      block: vi.fn(() => Promise.resolve()),
      unblock: vi.fn(() => Promise.resolve()),
      getMyBlocked: vi.fn(() => Promise.resolve([])),
    };

    await TestBed.configureTestingModule({
      providers: [
        BlockService,
        { provide: BlockApiService, useValue: api },
        {
          provide: AuthService,
          useValue: { currentUser: vi.fn(() => null) } as unknown as AuthService,
        },
      ],
    }).compileComponents();

    service = TestBed.runInInjectionContext(() => TestBed.inject(BlockService));
  });

  it('bloquea un usuario de forma optimista', async () => {
    await service.toggle(42);
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
    await service.toggle(42);
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
});

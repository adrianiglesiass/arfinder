import { TestBed } from '@angular/core/testing';

import { BlockApiService } from '@infrastructure/api/block/block.api.service';
import { vi } from 'vitest';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { type BlockChange, BlockEvents } from '@core/block/block-events';

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
  let changes: BlockChange[];

  beforeEach(async () => {
    api = {
      block: vi.fn(() => Promise.resolve()),
      unblock: vi.fn(() => Promise.resolve()),
      getMyBlocked: vi.fn(() => Promise.resolve([])),
    };
    changes = [];

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
    TestBed.inject(BlockEvents).changes$.subscribe((change) => changes.push(change));
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

  it('al bloquear con éxito avisa del cambio a los demás stores', async () => {
    await service.toggle(42);
    expect(changes).toEqual([{ profileId: 42, blocked: true }]);
  });

  it('al desbloquear con éxito avisa del cambio', async () => {
    service.blockedIds.set(new Set([42]));
    await service.toggle(42);
    expect(changes).toEqual([{ profileId: 42, blocked: false }]);
  });

  it('si la API falla, no avisa de nada', async () => {
    api.block = vi.fn(() => Promise.reject(new Error('boom')));
    await service.toggle(42);
    expect(changes).toEqual([]);
  });

  it('markBlocked marca el bloqueo al instante y avisa', () => {
    service.markBlocked(42);
    expect(service.blockedIds().has(42)).toBe(true);
    expect(changes).toEqual([{ profileId: 42, blocked: true }]);
  });

  it('ignora un segundo toggle sobre el mismo perfil mientras hay uno en vuelo', async () => {
    let finish!: () => void;
    api.block = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));

    const first = service.toggle(42);
    const second = await service.toggle(42);
    finish();

    expect(second).toBe(false);
    expect(await first).toBe(true);
    expect(api.block).toHaveBeenCalledTimes(1);
    expect(api.unblock).not.toHaveBeenCalled();
  });
});

import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProfileSearchApiService } from '@infrastructure/api/profile-search/profile-search.api.service';
import { vi } from 'vitest';

import type { ProfileSummary } from '@core/api/api.models';
import { BlockEvents } from '@core/block/block-events';

import { ProfileSearchService } from './profile-search.service';

const profile = (id: number): ProfileSummary => ({
  id,
  user_id: id,
  name: `P${id}`,
  age: 30,
  city: 'Madrid',
  has_pets: false,
  is_smoker: false,
  type: 'looking_for_flat',
  photo_urls: [],
});

describe('ProfileSearchService.removeProfile', () => {
  let service: ProfileSearchService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        {
          provide: ProfileSearchApiService,
          useValue: { search: vi.fn(() => Promise.resolve([])) },
        },
      ],
    });
    service = TestBed.inject(ProfileSearchService);
    TestBed.tick();
    await vi.waitFor(() => expect(service.isLoading()).toBe(false));
    service.profiles.set([profile(1), profile(2), profile(3), profile(4)]);
  });

  it('quita el perfil de los resultados cargados', () => {
    service.removeProfile(3);
    expect(service.profiles().map((p) => p.id)).toEqual([1, 2, 4]);
  });

  it('retrocede el deck si el perfil estaba antes de la posición actual', () => {
    service.deckIndex.set(2);
    service.removeProfile(1);
    expect(service.deckIndex()).toBe(1);
    expect(service.profiles()[service.deckIndex()].id).toBe(3);
  });

  it('no mueve el deck si el perfil es el actual o posterior', () => {
    service.deckIndex.set(1);
    service.removeProfile(2);
    expect(service.deckIndex()).toBe(1);
    service.removeProfile(4);
    expect(service.deckIndex()).toBe(1);
  });

  it('ignora un perfil que no está cargado', () => {
    service.deckIndex.set(2);
    service.removeProfile(99);
    expect(service.profiles()).toHaveLength(4);
    expect(service.deckIndex()).toBe(2);
  });

  it('al bloquear un perfil, lo quita de la búsqueda cargada', () => {
    TestBed.inject(BlockEvents).emit({ profileId: 2, blocked: true });
    expect(service.profiles().map((p) => p.id)).toEqual([1, 3, 4]);
  });

  it('al desbloquear, marca la búsqueda como caducada para recargarla en la próxima visita', () => {
    TestBed.inject(BlockEvents).emit({ profileId: 2, blocked: false });
    expect((service as unknown as { lastLoadedAt: number | null }).lastLoadedAt).toBeNull();
    expect(service.profiles()).toHaveLength(4);
  });

  it('pide más perfiles si se quita el último cargado y quedan más', () => {
    const loadMore = vi.spyOn(service, 'loadMore').mockResolvedValue();
    service.hasMore.set(true);
    service.deckIndex.set(3);

    service.removeProfile(4);

    expect(loadMore).toHaveBeenCalled();
  });
});

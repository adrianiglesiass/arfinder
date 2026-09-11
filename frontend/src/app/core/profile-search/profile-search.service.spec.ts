import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ProfileSearchApiService } from '@infrastructure/api/profile-search/profile-search.api.service';
import { vi } from 'vitest';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockEvents } from '@core/block/block-events';

import { ProfileSearchService } from './profile-search.service';

@Component({ template: '' })
class Blank {}

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

describe('ProfileSearchService', () => {
  let service: ProfileSearchService;
  let search: ReturnType<typeof vi.fn>;
  let router: Router;
  let location: Location;
  let currentUser: ReturnType<typeof signal<{ id: number } | null>>;

  const settle = async () => {
    TestBed.tick();
    await vi.waitFor(() => expect(service.isLoading()).toBe(false));
  };

  const navigate = async (url: string) => {
    await router.navigateByUrl(url);
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(async () => {
    search = vi.fn(() => Promise.resolve([profile(1), profile(2), profile(3), profile(4)]));
    currentUser = signal<{ id: number } | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'explorar', component: Blank },
          { path: 'perfil/:id', component: Blank },
        ]),
        provideLocationMocks(),
        { provide: ProfileSearchApiService, useValue: { search } },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    await router.navigateByUrl('/explorar');
    service = TestBed.inject(ProfileSearchService);
    await settle();
  });

  describe('removeProfile', () => {
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

    it('pide más perfiles si se quita el último cargado y quedan más', () => {
      const loadMore = vi.spyOn(service, 'loadMore').mockResolvedValue();
      service.hasMore.set(true);
      service.deckIndex.set(3);

      service.removeProfile(4);

      expect(loadMore).toHaveBeenCalled();
    });
  });

  describe('eventos de bloqueo', () => {
    it('al bloquear un perfil, lo quita de la búsqueda cargada', () => {
      TestBed.inject(BlockEvents).emit({ profileId: 2, blocked: true });
      expect(service.profiles().map((p) => p.id)).toEqual([1, 3, 4]);
    });

    it('al desbloquear, marca la búsqueda como caducada', () => {
      TestBed.inject(BlockEvents).emit({ profileId: 2, blocked: false });
      expect((service as unknown as { lastLoadedAt: number | null }).lastLoadedAt).toBeNull();
      expect(service.profiles()).toHaveLength(4);
    });
  });

  describe('persistencia de filtros', () => {
    it('navegar a un perfil no borra los filtros ni lanza otra búsqueda', async () => {
      service.updateFilter('city', 'Madrid');
      await settle();
      const calls = search.mock.calls.length;

      await navigate('/perfil/5');

      expect(service.filters()).toEqual({ city: 'Madrid' });
      expect(search.mock.calls.length).toBe(calls);
    });

    it('volver a /explorar sin query conserva los filtros y los reescribe en la URL', async () => {
      service.updateFilter('city', 'Madrid');
      await settle();
      await navigate('/perfil/5');

      await navigate('/explorar');

      expect(service.filters()).toEqual({ city: 'Madrid' });
      expect(location.path()).toBe('/explorar?city=Madrid');
    });

    it('un enlace con filtros los aplica', async () => {
      await navigate('/perfil/5');
      await navigate('/explorar?city=Sevilla');

      expect(service.filters()).toEqual({ city: 'Sevilla' });
    });
  });

  describe('recarga y sesión', () => {
    it('la recarga por caducidad conserva el perfil que se estaba viendo', async () => {
      service.deckIndex.set(2);
      (service as unknown as { lastLoadedAt: number }).lastLoadedAt = 0;
      search.mockResolvedValueOnce([profile(9), profile(1), profile(2), profile(3), profile(4)]);

      document.dispatchEvent(new Event('visibilitychange'));
      await vi.waitFor(() => expect(service.profiles()[0].id).toBe(9));

      expect(service.profiles()[service.deckIndex()].id).toBe(3);
    });

    it('iniciar sesión recarga la búsqueda en /explorar', async () => {
      const calls = search.mock.calls.length;

      currentUser.set({ id: 7 });
      TestBed.tick();

      await vi.waitFor(() => expect(search.mock.calls.length).toBe(calls + 1));
    });

    it('al cambiar de cuenta, los filtros de la anterior no pasan a la siguiente', async () => {
      currentUser.set({ id: 7 });
      TestBed.tick();
      await settle();
      service.updateFilter('city', 'Madrid');
      await settle();

      currentUser.set(null);
      TestBed.tick();
      await settle();

      expect(service.filters()).toEqual({});
    });

    it('cambiar de filtros con una página en vuelo no deja el spinner atascado', async () => {
      service.hasMore.set(true);
      search.mockReturnValueOnce(new Promise(() => undefined));
      void service.loadMore();
      expect(service.isLoadingMore()).toBe(true);

      service.updateFilter('city', 'Sevilla');
      await settle();

      expect(service.isLoadingMore()).toBe(false);
    });

    it('el valor inicial del usuario no provoca una recarga extra', () => {
      expect(search).toHaveBeenCalledTimes(1);
    });
  });

  describe('errores de paginación', () => {
    it('un fallo al cargar más no se confunde con el final de los resultados', async () => {
      service.hasMore.set(true);
      search.mockRejectedValueOnce(new Error('red'));

      await service.loadMore();

      expect(service.loadMoreError()).toBe(true);
      expect(service.hasMore()).toBe(true);
    });

    it('no reintenta solo; reintentar vuelve a pedir la misma página', async () => {
      service.hasMore.set(true);
      search.mockRejectedValueOnce(new Error('red'));
      await service.loadMore();
      const calls = search.mock.calls.length;

      await service.loadMore();
      expect(search.mock.calls.length).toBe(calls);

      service.retryLoadMore();
      await vi.waitFor(() => expect(search.mock.calls.length).toBe(calls + 1));
      expect(search.mock.calls.at(-1)?.[0]).toMatchObject({ skip: 24 });
    });
  });
});

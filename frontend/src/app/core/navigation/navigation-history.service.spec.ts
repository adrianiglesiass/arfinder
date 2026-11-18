import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';

import { Subject } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { NavigationHistoryService } from './navigation-history.service';

describe('NavigationHistoryService', () => {
  let events: Subject<NavigationEnd>;
  let currentUser: ReturnType<typeof signal<object | null>>;
  let service: NavigationHistoryService;

  function navigateTo(url: string, urlAfterRedirects = url): void {
    events.next(new NavigationEnd(1, url, urlAfterRedirects));
  }

  beforeEach(() => {
    events = new Subject<NavigationEnd>();
    currentUser = signal<object | null>({ id: 'user-1' });
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: events.asObservable() } },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    service = TestBed.inject(NavigationHistoryService);
    // Lets the session effect observe the initial user before the test mutates it.
    TestBed.tick();
  });

  it('returns null while no navigation has been recorded', () => {
    expect(service.previousUrl()).toBeNull();
  });

  it('records the redirected url, not the requested one', () => {
    navigateTo('/perfil/7', '/explorar');

    expect(service.previousUrl()).toBe('/explorar');
  });

  it('keeps the query string and the fragment so going back restores the page state', () => {
    navigateTo('/explorar?ciudad=Madrid&page=2#resultados');

    expect(service.previousUrl()).toBe('/explorar?ciudad=Madrid&page=2#resultados');
  });

  it.each(['/login', '/registro', '/verificar-email', '/auth/callback'])(
    'ignores the auth route "%s"',
    (url) => {
      navigateTo('/privacidad');
      navigateTo(url);

      expect(service.previousUrl()).toBe('/privacidad');
    }
  );

  it('ignores the same url navigated twice in a row', () => {
    navigateTo('/explorar');
    navigateTo('/explorar');

    expect(service.previousUrl()).toBe('/explorar');
  });

  it('replaces the recorded url when the same page changes its query string', () => {
    navigateTo('/explorar?page=1');
    navigateTo('/explorar?page=2');

    expect(service.previousUrl()).toBe('/explorar?page=2');
  });

  it('drops the history when the session is lost, so back never points at a private screen', () => {
    navigateTo('/mensajes');

    currentUser.set(null);
    TestBed.tick();

    expect(service.previousUrl()).toBeNull();
  });

  it('keeps the history while the session is still alive', () => {
    navigateTo('/mensajes');

    currentUser.set({ id: 'user-2' });
    TestBed.tick();

    expect(service.previousUrl()).toBe('/mensajes');
  });

  it('forgets everything on reset', () => {
    navigateTo('/mensajes');

    service.reset();

    expect(service.previousUrl()).toBeNull();
  });
});

describe('NavigationHistoryService during the session bootstrap', () => {
  it('keeps the recorded url while currentUser is still null', () => {
    TestBed.resetTestingModule();
    const events = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: events.asObservable() } },
        { provide: AuthService, useValue: { currentUser: signal<object | null>(null) } },
      ],
    });
    const service = TestBed.inject(NavigationHistoryService);
    TestBed.tick();

    events.next(new NavigationEnd(1, '/privacidad', '/privacidad'));
    TestBed.tick();

    expect(service.previousUrl()).toBe('/privacidad');
  });
});

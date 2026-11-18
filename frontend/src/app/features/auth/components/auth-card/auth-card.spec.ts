import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { vi } from 'vitest';

import { ROUTES } from '@core/constants/routes';
import { NavigationHistoryService } from '@core/navigation/navigation-history.service';

import { AuthCard } from './auth-card';

type AuthTab = 'login' | 'register' | 'verify';

describe('AuthCard', () => {
  let previousUrl: WritableSignal<string | null>;
  let router: Router;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    previousUrl = signal<string | null>(null);
    await TestBed.configureTestingModule({
      imports: [AuthCard],
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: 'registro', children: [] },
          { path: 'explorar', children: [] },
          { path: 'mensajes', children: [] },
        ]),
        { provide: NavigationHistoryService, useValue: { previousUrl } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    await router.navigateByUrl(ROUTES.LOGIN);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  function render(activeTab: AuthTab): HTMLElement {
    const fixture = TestBed.createComponent(AuthCard);
    fixture.componentRef.setInput('activeTab', activeTab);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function backButton(element: HTMLElement): HTMLButtonElement | undefined {
    return element.querySelector<HTMLButtonElement>('app-icon-button button') ?? undefined;
  }

  it.each(['login', 'register', 'verify'] as const)(
    'shows a "Volver" button on the %s variant',
    (activeTab) => {
      const button = backButton(render(activeTab));

      expect(button?.getAttribute('aria-label')).toBe('Volver');
      expect(button?.type).toBe('button');
    }
  );

  it('navigates to the recorded previous url', () => {
    previousUrl.set('/mensajes');

    backButton(render('register'))?.click();

    expect(navigateByUrl).toHaveBeenCalledWith('/mensajes');
  });

  it('keeps the query string of the previous url', () => {
    previousUrl.set('/explorar?ciudad=Madrid');

    backButton(render('login'))?.click();

    expect(navigateByUrl).toHaveBeenCalledWith('/explorar?ciudad=Madrid');
  });

  it('falls back to the public landing when there is no previous url', () => {
    backButton(render('login'))?.click();

    expect(navigateByUrl).toHaveBeenCalledWith(ROUTES.ROOT);
  });

  it('returns to the register form from the email verification step', () => {
    previousUrl.set('/privacidad');

    backButton(render('verify'))?.click();

    expect(navigateByUrl).toHaveBeenCalledWith(ROUTES.REGISTER);
  });

  it('falls back to the landing when a guard leaves the user on the auth screen', async () => {
    previousUrl.set('/mensajes');
    navigateByUrl.mockResolvedValue(false);

    backButton(render('login'))?.click();

    await vi.waitFor(() => expect(navigateByUrl).toHaveBeenLastCalledWith(ROUTES.ROOT));
  });

  it('does not add a minute when the guard already redirected somewhere', async () => {
    previousUrl.set('/mensajes');
    navigateByUrl.mockImplementation(async (url: string) => {
      await Router.prototype.navigateByUrl.call(router, url);
      return false;
    });

    backButton(render('login'))?.click();

    await vi.waitFor(() => expect(router.url).toBe('/mensajes'));
    expect(navigateByUrl).toHaveBeenCalledTimes(1);
  });
});

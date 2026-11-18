import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { routes } from '@app/app.routes';
import { vi } from 'vitest';

import { guestGuard } from '@core/auth/guest-guard';
import { ROUTES } from '@core/constants/routes';

import Landing from './landing';

describe('Landing', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: 'registro', children: [] },
        ]),
      ],
    });
    router = TestBed.inject(Router);
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function clickCallToAction(element: HTMLElement, index: number): void {
    element
      .querySelectorAll('app-button button')
      [index]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  it('renders both calls to action', () => {
    const element = render();

    expect(element.textContent).toContain('Entrar');
    expect(element.textContent).toContain('Crear cuenta');
  });

  it('navigates to the register page from the primary call to action', async () => {
    clickCallToAction(render(), 0);

    await vi.waitFor(() => expect(router.url).toBe(ROUTES.REGISTER));
  });

  it('navigates to the login page from the secondary call to action', async () => {
    clickCallToAction(render(), 1);

    await vi.waitFor(() => expect(router.url).toBe(ROUTES.LOGIN));
  });

  it('registers "/" as a public route served by the guest guard', () => {
    const route = routes.find(
      (candidate) => candidate.path === '' && candidate.pathMatch === 'full'
    );

    expect(route?.canActivate).toEqual([guestGuard]);
    expect(route?.loadComponent).toBeTypeOf('function');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { ROUTES } from '@core/constants/routes';

import { guestGuard } from './guest-guard';

describe('guestGuard', () => {
  let isAuthenticated: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    isAuthenticated = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'explorar', children: [] }]),
        { provide: AuthService, useValue: { isAuthenticated } },
      ],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(): Promise<boolean | import('@angular/router').UrlTree> {
    return TestBed.runInInjectionContext(
      () => guestGuard({} as never, {} as never) as Promise<boolean>
    );
  }

  it('lets anonymous visitors through', async () => {
    isAuthenticated.mockResolvedValue(false);

    await expect(runGuard()).resolves.toBe(true);
    expect(router.url).toBe('/');
  });

  it('sends authenticated users to the explore page', async () => {
    isAuthenticated.mockResolvedValue(true);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await expect(runGuard()).resolves.toBe(false);
    expect(navigate).toHaveBeenCalledWith([ROUTES.EXPLORE]);
  });
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthApiService } from '@infrastructure/api/auth/auth.api.service';
import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { InsForgeClient } from '@insforge/sdk';
import { vi } from 'vitest';

import { STORAGE_KEYS } from '@core/constants/storage-keys';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';

import { AuthService } from './auth.service';

const REFRESH_KEY = STORAGE_KEYS.auth.refreshToken;

describe('AuthService — refresco de sesión', () => {
  let service: AuthService;
  let refreshSession: ReturnType<typeof vi.fn>;
  let getMe: ReturnType<typeof vi.fn>;
  let router: { navigate: ReturnType<typeof vi.fn>; url: string };

  const failWith = (statusCode: number) =>
    refreshSession.mockResolvedValue({ data: null, error: { statusCode, message: 'x' } });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(REFRESH_KEY, 'refresh-viejo');
    refreshSession = vi.fn();
    getMe = vi.fn();
    router = { navigate: vi.fn(() => Promise.resolve(true)), url: '/login' };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthApiService, useValue: { getMe } },
        { provide: ProfileApiService, useValue: {} },
        {
          provide: OnboardingPersistenceService,
          useValue: { ensureUser: vi.fn(), clearAll: vi.fn() },
        },
        { provide: Router, useValue: router },
        {
          provide: InsForgeClient,
          useValue: { auth: { refreshSession } } as unknown as InsForgeClient,
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    (service as unknown as { cancelBootstrapRetry: () => void }).cancelBootstrapRetry();
  });

  it('borra los tokens si el refresh token es rechazado (401)', async () => {
    failWith(401);

    const outcome = await service.refreshSessionToken();

    expect(outcome).toEqual({ token: null, transient: false });
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it('trata como definitivo un estado que no es transitorio (404)', async () => {
    failWith(404);

    const outcome = await service.refreshSessionToken();

    expect(outcome).toEqual({ token: null, transient: false });
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it('conserva el refresh token ante un fallo de red envuelto por el SDK (500)', async () => {
    failWith(500);

    const outcome = await service.refreshSessionToken();

    expect(outcome).toEqual({ token: null, transient: true });
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-viejo');
  });

  it('conserva el refresh token si InsForge limita peticiones (429)', async () => {
    failWith(429);

    const outcome = await service.refreshSessionToken();

    expect(outcome).toEqual({ token: null, transient: true });
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-viejo');
  });

  it('conserva el refresh token si el SDK lanza una excepción', async () => {
    refreshSession.mockRejectedValue(new TypeError('Failed to fetch'));

    const outcome = await service.refreshSessionToken();

    expect(outcome).toEqual({ token: null, transient: true });
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-viejo');
  });

  it('guarda los tokens nuevos cuando el refresco va bien', async () => {
    refreshSession.mockResolvedValue({
      data: { accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' },
      error: null,
    });

    const outcome = await service.refreshSessionToken();

    expect(outcome).toEqual({ token: 'access-nuevo' });
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-nuevo');
  });

  it('reintenta el arranque al volver la conexión y sale del login', async () => {
    failWith(500);
    await service.init();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-viejo');

    refreshSession.mockResolvedValue({
      data: { accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' },
      error: null,
    });
    getMe.mockResolvedValue({ id: 7, email: 'a@b.com' });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(service.currentUser()?.id).toBe(7));

    expect(router.navigate).toHaveBeenCalledWith(['/explorar']);
  });

  it('no relanza el arranque si el usuario ya ha iniciado sesión a mano', async () => {
    failWith(500);
    await service.init();
    service.currentUser.set({ id: 9 } as never);
    const callsBefore = refreshSession.mock.calls.length;

    window.dispatchEvent(new Event('online'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(refreshSession.mock.calls.length).toBe(callsBefore);
    expect(service.currentUser()?.id).toBe(9);
  });
});

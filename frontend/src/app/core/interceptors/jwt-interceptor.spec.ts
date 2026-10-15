import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { AuthService, type RefreshOutcome } from '@core/auth/auth.service';

import { authErrorInterceptor } from './jwt-interceptor';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: {
    refreshSessionToken: ReturnType<typeof vi.fn>;
    invalidateSession: ReturnType<typeof vi.fn>;
  };
  const url = `${environment.APIURL}/profiles/me`;

  const requestAndFail401 = async (outcome: RefreshOutcome) => {
    auth.refreshSessionToken.mockResolvedValue(outcome);
    const result = firstValueFrom(http.get(url)).catch((err) => err);
    backend.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
    return result;
  };

  beforeEach(() => {
    auth = {
      refreshSessionToken: vi.fn(),
      invalidateSession: vi.fn(() => Promise.resolve()),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth as unknown as AuthService },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('no cierra la sesión si el refresco falla de forma transitoria', async () => {
    const error = await requestAndFail401({ token: null, transient: true });

    expect(error.status).toBe(401);
    expect(auth.invalidateSession).not.toHaveBeenCalled();
  });

  it('cierra la sesión si el refresh token es rechazado', async () => {
    const error = await requestAndFail401({ token: null, transient: false });

    expect(error.status).toBe(401);
    expect(auth.invalidateSession).toHaveBeenCalled();
  });

  it('reintenta la petición con el token nuevo si el refresco va bien', async () => {
    auth.refreshSessionToken.mockResolvedValue({ token: 'access-nuevo' });
    const result = firstValueFrom(http.get<{ ok: boolean }>(url));

    backend.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const retry = backend.expectOne(url);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-nuevo');
    retry.flush({ ok: true });

    expect(await result).toEqual({ ok: true });
  });
});

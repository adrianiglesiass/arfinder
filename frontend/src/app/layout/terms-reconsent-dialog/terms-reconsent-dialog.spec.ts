import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { vi } from 'vitest';

import type { ProfileResponse, UserResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { LEGAL_DOCS_VERSION } from '@core/constants/legal-info';
import { ROUTES } from '@core/constants/routes';
import { ProfileService } from '@core/profile/profile.service';

import { TermsReconsentDialog } from './terms-reconsent-dialog';

function makeUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 1,
    email: 'user@test.com',
    created_at: '2026-01-01T00:00:00Z',
    terms_accepted_at: null,
    terms_version: null,
    ...overrides,
  };
}

describe('TermsReconsentDialog', () => {
  let fixture: ComponentFixture<TermsReconsentDialog>;
  let component: TermsReconsentDialog;
  let currentUser: ReturnType<typeof signal<UserResponse | null>>;
  let currentProfile: ReturnType<typeof signal<ProfileResponse | null>>;
  let acceptTerms: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;

  function dialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  function renderWith(user: UserResponse | null, hasProfile: boolean) {
    currentUser.set(user);
    currentProfile.set(hasProfile ? ({ id: 1 } as ProfileResponse) : null);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    currentUser = signal<UserResponse | null>(null);
    currentProfile = signal<ProfileResponse | null>(null);
    acceptTerms = vi.fn();
    logout = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [TermsReconsentDialog],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, acceptTerms, logout } },
        { provide: ProfileService, useValue: { currentProfile } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsReconsentDialog);
    component = fixture.componentInstance;
  });

  it('is hidden for guests and for users without a profile', () => {
    renderWith(null, true);
    expect(dialog()).toBeNull();

    renderWith(makeUser(), false);
    expect(dialog()).toBeNull();
  });

  it('is hidden when the current version was already accepted', () => {
    renderWith(
      makeUser({ terms_accepted_at: '2026-09-16T10:00:00Z', terms_version: LEGAL_DOCS_VERSION }),
      true
    );
    expect(dialog()).toBeNull();
  });

  it('blocks users with a profile who have not accepted the current version', () => {
    renderWith(
      makeUser({ terms_accepted_at: '2020-01-01T00:00:00Z', terms_version: '0.0.1' }),
      true
    );

    expect(dialog()).not.toBeNull();
    expect(dialog()?.textContent).toContain('Cerrar sesión');
  });

  it('requires the checkbox before calling the consent endpoint', async () => {
    renderWith(makeUser(), true);

    await component.accept();
    fixture.detectChanges();

    expect(acceptTerms).not.toHaveBeenCalled();
    expect(dialog()?.textContent).toContain('Debes aceptar para continuar');
  });

  it('closes only after the consent is saved', async () => {
    renderWith(makeUser(), true);
    acceptTerms.mockImplementation(async (version: string) => {
      currentUser.set(
        makeUser({ terms_accepted_at: '2026-09-16T10:00:00Z', terms_version: version })
      );
    });

    component.accepted.set(true);
    await component.accept();
    fixture.detectChanges();

    expect(acceptTerms).toHaveBeenCalledWith(LEGAL_DOCS_VERSION);
    expect(dialog()).toBeNull();
  });

  it('stays open and shows an error when saving fails', async () => {
    renderWith(makeUser(), true);
    acceptTerms.mockRejectedValue(new Error('network'));

    component.accepted.set(true);
    await component.accept();
    fixture.detectChanges();

    expect(dialog()).not.toBeNull();
    expect(dialog()?.textContent).toContain('No se pudo guardar tu aceptación');
  });

  it('logs out and navigates to login as the alternative', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    renderWith(makeUser(), true);

    await component.logout();

    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([ROUTES.LOGIN]);
  });
});

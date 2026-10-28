import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { LEGAL_DOCS_VERSION } from '@core/constants/legal-info';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';
import { ProfileService } from '@core/profile/profile.service';

import Onboarding from './onboarding';

describe('Onboarding', () => {
  let fixture: ComponentFixture<Onboarding>;
  let component: Onboarding;
  let saveOnboarding: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    saveOnboarding = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: { saveOnboarding, loadProfile: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            init: vi.fn(),
            deleteAccount: vi.fn(),
            // Consent gate neutralised here: these tests target submit idempotency
            // and step navigation, not the legal-consent step. A user that already
            // accepted the current version makes needsConsent() false.
            currentUser: vi.fn(() => ({
              terms_accepted_at: '2026-01-01T00:00:00Z',
              terms_version: LEGAL_DOCS_VERSION,
            })),
          },
        },
        {
          provide: OnboardingPersistenceService,
          useValue: {
            saveForm: vi.fn(),
            loadForm: vi.fn(() => null),
            saveCurrentStep: vi.fn(),
            loadCurrentStep: vi.fn(() => 1),
            clearAll: vi.fn(),
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    component.form.update((f) => ({ ...f, name: 'Alex', age: 26, city: 'Madrid' }));
    component.currentStep.set(component.totalSteps);
  });

  it('saves the profile only once when the last step is submitted twice', async () => {
    let finish!: () => void;
    saveOnboarding.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const first = component.nextStep();
    const second = component.nextStep();
    expect(component.isSubmitting()).toBe(true);

    finish();
    await Promise.all([first, second]);

    expect(saveOnboarding).toHaveBeenCalledTimes(1);
    expect(component.isSubmitting()).toBe(false);
  });

  it('allows retrying after a failed submit', async () => {
    saveOnboarding.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);

    await component.nextStep();
    expect(component.isSubmitting()).toBe(false);

    await component.nextStep();
    expect(saveOnboarding).toHaveBeenCalledTimes(2);
  });

  it('ignores going back while submitting', () => {
    saveOnboarding.mockReturnValue(new Promise<void>(() => undefined));
    void component.nextStep();

    component.prevStep();

    expect(component.currentStep()).toBe(component.totalSteps);
  });
});

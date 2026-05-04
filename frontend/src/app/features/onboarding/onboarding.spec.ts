import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthApiService } from '@infrastructure/api/auth/auth.api.service';
import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { InsForgeClient } from '@insforge/sdk';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { ErrorService } from '@core/errors';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';
import { ProfileService } from '@core/profile/profile.service';

import Onboarding from './onboarding';

describe('Onboarding', () => {
  let component: Onboarding;
  let fixture: ComponentFixture<Onboarding>;

  beforeEach(async () => {
    const mockInsForgeClient = {
      tokenManager: {
        saveSession: vi.fn(),
        clearSession: vi.fn(),
        getAccessToken: vi.fn().mockReturnValue(null),
      },
      http: {
        setAuthToken: vi.fn(),
        setRefreshToken: vi.fn(),
      },
    };

    const mockRouter = {
      navigate: vi.fn(),
    };

    const mockMessageService = {
      add: vi.fn(),
    };

    const mockAuthApiService = {
      login: vi.fn(),
      register: vi.fn(),
    };

    const mockProfileApiService = {
      getProfile: vi.fn(),
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
    };

    const mockProfileService = {
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
    };

    const mockOnboardingPersistenceService = {
      saveForm: vi.fn(),
      saveCurrentStep: vi.fn(),
      loadForm: vi.fn(),
      loadCurrentStep: vi.fn(),
      clear: vi.fn(),
    };

    const mockErrorService = {
      handleError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Onboarding],
      providers: [
        { provide: InsForgeClient, useValue: mockInsForgeClient },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        { provide: AuthApiService, useValue: mockAuthApiService },
        { provide: ProfileApiService, useValue: mockProfileApiService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: OnboardingPersistenceService, useValue: mockOnboardingPersistenceService },
        { provide: ErrorService, useValue: mockErrorService },
        AuthService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

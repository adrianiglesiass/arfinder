import { TestBed } from '@angular/core/testing';

import { STORAGE_KEYS } from '@core/constants/storage-keys';

import { OnboardingPersistenceService } from './onboarding-persistence.service';

describe('OnboardingPersistenceService', () => {
  let service: OnboardingPersistenceService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnboardingPersistenceService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clearAll removes pending onboarding photos from localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.onboarding.pendingPhotos, '[{"id":"1"}]');
    localStorage.setItem(STORAGE_KEYS.onboarding.pendingPhotosOrder, '["local:1"]');

    service.clearAll();

    expect(localStorage.getItem(STORAGE_KEYS.onboarding.pendingPhotos)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.onboarding.pendingPhotosOrder)).toBeNull();
  });

  it('clearAll removes onboarding progress from sessionStorage', () => {
    service.saveForm({ name: 'Ana' } as never);
    service.saveCurrentStep(3);
    sessionStorage.setItem(STORAGE_KEYS.onboarding.lastUserId, '7');

    service.clearAll();

    expect(service.loadForm()).toBeNull();
    expect(service.loadCurrentStep()).toBe(1);
    expect(sessionStorage.getItem(STORAGE_KEYS.onboarding.lastUserId)).toBeNull();
  });

  it('clearAll keeps unrelated localStorage entries', () => {
    localStorage.setItem(STORAGE_KEYS.pwa.iosHintDismissed, 'true');

    service.clearAll();

    expect(localStorage.getItem(STORAGE_KEYS.pwa.iosHintDismissed)).toBe('true');
  });
});

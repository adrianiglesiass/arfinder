import { Injectable } from '@angular/core';

import { ProfileCreate } from '@core/api/api.models';

const ONBOARDING_STORAGE_KEY = 'arfinder_onboarding_form';
const CURRENT_STEP_KEY = 'arfinder_current_step';
const PENDING_PHOTOS_KEY = 'arfinder_pending_photos';
const PHOTO_ORDER_KEY = 'arfinder_pending_photos_order';
const LAST_USER_KEY = 'arfinder_onboarding_user_id';

@Injectable({
  providedIn: 'root',
})
export class OnboardingPersistenceService {
  saveForm(form: Partial<ProfileCreate>): void {
    try {
      sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(form));
    } catch (error) {
      console.error('Error saving onboarding form:', error);
    }
  }

  loadForm(): Partial<ProfileCreate> | null {
    try {
      const data = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading onboarding form:', error);
      return null;
    }
  }

  saveCurrentStep(step: number): void {
    try {
      sessionStorage.setItem(CURRENT_STEP_KEY, step.toString());
    } catch (error) {
      console.error('Error saving current step:', error);
    }
  }

  loadCurrentStep(): number {
    try {
      const step = sessionStorage.getItem(CURRENT_STEP_KEY);
      return step ? parseInt(step, 10) : 1;
    } catch (error) {
      console.error('Error loading current step:', error);
      return 1;
    }
  }

  ensureUser(userId: number): void {
    try {
      const stored = sessionStorage.getItem(LAST_USER_KEY);
      const storedId = stored ? parseInt(stored, 10) : null;

      if (!storedId || storedId !== userId) {
        this.clearAll();
        sessionStorage.setItem(LAST_USER_KEY, userId.toString());
      }
    } catch (error) {
      console.error('Error checking onboarding user:', error);
    }
  }

  clearAll(): void {
    try {
      sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      sessionStorage.removeItem(CURRENT_STEP_KEY);
      sessionStorage.removeItem(PENDING_PHOTOS_KEY);
      sessionStorage.removeItem(PHOTO_ORDER_KEY);
      sessionStorage.removeItem(LAST_USER_KEY);
    } catch (error) {
      console.error('Error clearing onboarding storage:', error);
    }
  }
}

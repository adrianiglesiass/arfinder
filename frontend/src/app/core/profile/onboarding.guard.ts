import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

import { AuthService } from '@core/auth/auth.service';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';

export const onboardingGuard: CanActivateFn = async () => {
  const profileApi = inject(ProfileApiService);
  const router = inject(Router);
  const persistence = inject(OnboardingPersistenceService);
  const authService = inject(AuthService);

  try {
    if (persistence.loadForm()) return true;
  } catch {
    /* empty */
  }

  try {
    await profileApi.getMyProfile();
    return router.createUrlTree(['/']);
  } catch (error) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) return true;

      if (error.status === 401 || error.status === 403) {
        await authService.invalidateSession();
        return router.createUrlTree(['/login']);
      }
    }

    return true;
  }
};

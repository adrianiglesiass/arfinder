import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

export const onboardingGuard: CanActivateFn = async () => {
  const profileApi = inject(ProfileApiService);
  const router = inject(Router);

  try {
    await profileApi.getMyProfile();

    await router.navigate(['/']);
    return false;
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return true;
    }
    return true;
  }
};

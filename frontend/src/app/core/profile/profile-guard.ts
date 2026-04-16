import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

export const profileGuard: CanActivateFn = async () => {
  const profileApi = inject(ProfileApiService);
  const router = inject(Router);

  try {
    await profileApi.getMyProfile();
    return true;
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      await router.navigate(['/onboarding']);
      return false;
    }
    return true;
  }
};

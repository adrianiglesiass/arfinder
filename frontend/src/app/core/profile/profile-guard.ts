import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProfileService } from '@core/profile/profile.service';

export const profileGuard: CanActivateFn = async () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  try {
    await profileService.loadProfile();
    return true;
  } catch (error) {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      await router.navigate(['/onboarding']);
      return false;
    }
    return false;
  }
};

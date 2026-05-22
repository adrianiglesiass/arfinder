import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ROUTES } from '@core/constants/routes';

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (await authService.isAuthenticated()) {
    await router.navigate([ROUTES.ROOT]);
    return false;
  }

  return true;
};

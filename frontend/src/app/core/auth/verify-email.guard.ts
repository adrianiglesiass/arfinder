import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ROUTES } from '@core/constants/routes';
import { STORAGE_KEYS } from '@core/constants/storage-keys';

export const verifyEmailGuard: CanActivateFn = () => {
  const router = inject(Router);
  const email = sessionStorage.getItem(STORAGE_KEYS.auth.pendingEmail);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return router.createUrlTree([ROUTES.LOGIN]);
  }

  return true;
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const verifyEmailGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const email = route.queryParamMap.get('email');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

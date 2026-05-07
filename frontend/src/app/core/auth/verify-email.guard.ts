import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const verifyEmailGuard: CanActivateFn = () => {
  const router = inject(Router);
  const email = sessionStorage.getItem('arfinder_pending_email');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

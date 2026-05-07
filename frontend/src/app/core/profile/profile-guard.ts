import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ProfileService } from '@core/profile/profile.service';

export const profileGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const profile = inject(ProfileService);
  if (!(await auth.isAuthenticated())) return true;
  void profile.ensureProfile();
  return true;
};

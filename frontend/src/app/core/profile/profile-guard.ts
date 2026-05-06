import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { ProfileService } from '@core/profile/profile.service';

export const profileGuard: CanActivateFn = () => {
  void inject(ProfileService).ensureProfile();
  return true;
};

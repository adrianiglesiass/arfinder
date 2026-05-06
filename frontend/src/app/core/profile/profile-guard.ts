import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { ProfileService } from '@core/profile/profile.service';

export const profileGuard: CanActivateFn = () => {
  // No bloqueante: el componente puede renderizar el shell + skeleton mientras
  // la carga termina en background. El propio servicio se encarga de redirigir
  // a /onboarding si el backend responde 404.
  void inject(ProfileService).ensureProfile();
  return true;
};

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from '@app/app.routes';
import { environment } from '@env/environment';
import { InsForgeClient } from '@insforge/sdk';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { AuthService } from '@core/auth/auth.service';
import { authErrorInterceptor, jwtInterceptor } from '@core/interceptors/jwt-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.init();
    }),

    provideHttpClient(withInterceptors([jwtInterceptor, authErrorInterceptor])),
    {
      provide: InsForgeClient,
      useFactory: () =>
        new InsForgeClient({
          baseUrl: environment.insforge.url,
          anonKey: environment.insforge.apiKey,
        }),
    },
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: false },
      },
      translation: {
        weak: 'Débil',
        medium: 'Media',
        strong: 'Fuerte',
        passwordPrompt: 'Introduce tu contraseña',
        choose: 'Seleccionar',
        upload: 'Subir',
        cancel: 'Cancelar',
        accept: 'Aceptar',
        reject: 'Rechazar',
        clear: 'Limpiar',
      },
    }),
  ],
};

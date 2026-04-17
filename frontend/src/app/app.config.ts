import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { environment } from '@env/environment';
import { InsForgeClient } from '@insforge/sdk';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { authErrorInterceptor, jwtInterceptor } from '@core/interceptors/jwt-interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),

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

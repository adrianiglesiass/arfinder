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
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { AuthService } from '@core/auth/auth.service';
import { authErrorInterceptor, jwtInterceptor } from '@core/interceptors/jwt-interceptor';

const ArfinderPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      void inject(AuthService).init();
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
        preset: ArfinderPreset,
        options: {
          darkModeSelector: false,
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng, components, utilities',
          },
        },
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

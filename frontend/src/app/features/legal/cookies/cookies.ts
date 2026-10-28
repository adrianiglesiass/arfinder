import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LEGAL_INFO } from '@core/constants/legal-info';
import { ROUTES } from '@core/constants/routes';
import { STORAGE_KEYS } from '@core/constants/storage-keys';

import { LegalPageLayout } from '@features/legal/components/legal-page-layout/legal-page-layout';

interface StorageItem {
  readonly keys: string;
  readonly purpose: string;
}

@Component({
  selector: 'app-cookies',
  imports: [RouterLink, LegalPageLayout],
  templateUrl: './cookies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Cookies {
  protected readonly legal = LEGAL_INFO;
  protected readonly routes = ROUTES;

  protected readonly localStorageItems: readonly StorageItem[] = [
    {
      keys: STORAGE_KEYS.auth.accessToken,
      purpose: 'Token de acceso para mantener tu sesión iniciada.',
    },
    {
      keys: STORAGE_KEYS.auth.refreshToken,
      purpose: 'Token para renovar la sesión sin volver a introducir tus credenciales.',
    },
    {
      keys: STORAGE_KEYS.pwa.iosHintDismissed,
      purpose: 'Recordar que has cerrado el aviso para instalar la aplicación en iOS.',
    },
    {
      keys: `${STORAGE_KEYS.onboarding.pendingPhotos}, ${STORAGE_KEYS.onboarding.pendingPhotosOrder}`,
      purpose:
        'Conservar las fotos seleccionadas durante el registro inicial. Se eliminan al subirlas o al cerrar sesión.',
    },
    {
      keys: STORAGE_KEYS.explore.viewMode,
      purpose: 'Recordar si prefieres ver los perfiles en tarjetas o en cuadrícula.',
    },
  ];

  protected readonly sessionStorageItems: readonly StorageItem[] = [
    {
      keys: `${STORAGE_KEYS.profile.me}, ${STORAGE_KEYS.profile.byId}`,
      purpose: 'Caché temporal de perfiles para que la aplicación cargue más rápido.',
    },
    {
      keys: `${STORAGE_KEYS.onboarding.form}, ${STORAGE_KEYS.onboarding.currentStep}, ${STORAGE_KEYS.onboarding.lastUserId}`,
      purpose: 'Guardar el progreso del formulario de registro inicial si recargas la página.',
    },
    {
      keys: STORAGE_KEYS.auth.pendingEmail,
      purpose: 'Recordar tu email mientras esperas a verificarlo.',
    },
    {
      keys: 'insforge_pkce_verifier',
      purpose:
        'Verificador temporal del inicio de sesión con Google o Apple. Lo crea el SDK del proveedor de autenticación y se elimina al completar el inicio de sesión.',
    },
  ];
}

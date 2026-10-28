import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { LEGAL_DOCS_VERSION } from '@core/constants/legal-info';
import { ROUTES } from '@core/constants/routes';
import { needsTermsConsent } from '@core/legal/terms-consent';
import { ProfileService } from '@core/profile/profile.service';

import { Button } from '@shared/components/button/button';
import { TermsConsent } from '@shared/components/terms-consent/terms-consent';
import { ModalDialog } from '@shared/directives/modal-dialog';
import { uniqueId } from '@shared/utils/unique-id';

/**
 * Blocking dialog for users who already have a profile but have not accepted the
 * current version of the legal documents (e.g. accounts created before consent was
 * recorded, or after LEGAL_DOCS_VERSION is bumped). It cannot be dismissed: the user
 * must accept or log out.
 */
@Component({
  selector: 'app-terms-reconsent-dialog',
  imports: [Button, TermsConsent, ModalDialog],
  templateUrl: './terms-reconsent-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsReconsentDialog {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly titleId = uniqueId('terms-reconsent-title');
  readonly descriptionId = uniqueId('terms-reconsent-description');

  readonly accepted = signal(false);
  readonly showError = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly isOpen = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !this.profileService.currentProfile()) return false;
    return needsTermsConsent(user, LEGAL_DOCS_VERSION);
  });

  async accept(): Promise<void> {
    if (this.isSubmitting()) return;
    if (!this.accepted()) {
      this.showError.set(true);
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);
    try {
      await this.authService.acceptTerms(LEGAL_DOCS_VERSION);
      this.accepted.set(false);
      this.showError.set(false);
    } catch {
      this.submitError.set('No se pudo guardar tu aceptación. Inténtalo de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.isSubmitting()) return;
    await this.authService.logout();
    await this.router.navigate([ROUTES.LOGIN]);
  }
}

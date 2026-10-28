import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CheckboxModule } from 'primeng/checkbox';

import { ROUTES } from '@core/constants/routes';

@Component({
  selector: 'app-terms-consent',
  imports: [FormsModule, CheckboxModule, RouterLink],
  templateUrl: './terms-consent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsConsent {
  accepted = input.required<boolean>();
  showError = input<boolean>(false);

  acceptedChange = output<boolean>();

  protected readonly routes = ROUTES;
  protected readonly inputId = 'termsConsent';
  protected readonly errorId = 'termsConsentError';

  protected readonly hasError = computed(() => this.showError() && !this.accepted());

  /** Accessibility attributes forwarded to the native checkbox input. */
  protected readonly checkboxPt = computed(() => ({
    input: {
      'aria-invalid': this.hasError() ? 'true' : 'false',
      'aria-describedby': this.hasError() ? this.errorId : null,
    },
  }));
}

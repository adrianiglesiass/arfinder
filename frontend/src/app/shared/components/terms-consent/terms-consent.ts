import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CheckboxModule } from 'primeng/checkbox';

import { ROUTES } from '@core/constants/routes';

import { uniqueId } from '@shared/utils/unique-id';

@Component({
  selector: 'app-terms-consent',
  imports: [FormsModule, CheckboxModule, RouterLink],
  templateUrl: './terms-consent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsConsent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  accepted = input.required<boolean>();
  showError = input<boolean>(false);

  acceptedChange = output<boolean>();

  protected readonly routes = ROUTES;
  protected readonly inputId = uniqueId('termsConsent');
  protected readonly errorId = uniqueId('termsConsentError');

  protected readonly hasError = computed(() => this.showError() && !this.accepted());

  /** Moves focus to the checkbox, e.g. when the surrounding form reveals a validation error. */
  focusInput(): void {
    this.host.querySelector<HTMLInputElement>(`#${this.inputId}`)?.focus();
  }

  /** Accessibility attributes forwarded to the native checkbox input. */
  protected readonly checkboxPt = computed(() => ({
    input: {
      'aria-invalid': this.hasError() ? 'true' : 'false',
      'aria-describedby': this.hasError() ? this.errorId : null,
    },
  }));
}

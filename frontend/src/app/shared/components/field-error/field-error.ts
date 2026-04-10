import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { MessageModule } from 'primeng/message';

const ERROR_MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  email: 'Introduce un correo válido.',
  minlength: 'Mínimo 8 caracteres.',
  hasUppercase: 'Debe contener al menos una mayúscula.',
  hasLowercase: 'Debe contener al menos una minúscula.',
  hasNumeric: 'Debe contener al menos un número.',
  validateEmail: 'El email debe ser válido',
};

@Component({
  selector: 'app-field-error',
  imports: [MessageModule],
  template: `
    @if (control().invalid && control().touched) {
      @for (error of getErrors(); track error) {
        <p-message severity="error" size="small" variant="simple">{{ error }}</p-message>
      }
    }
  `,
})
export class FieldError {
  control = input.required<AbstractControl>();
  serverError = input<string | null>(null);

  getErrors(): string[] {
    const control = this.control();
    const serverErr = this.serverError();

    const errorMessages: string[] = [];

    if (serverErr) {
      return [serverErr];
    }

    const errors = control.errors;
    if (!errors) return [];

    if (errors['serverError']) {
      const serverErrorValue = errors['serverError'];
      if (typeof serverErrorValue === 'string') {
        errorMessages.push(serverErrorValue);
      }
    }

    Object.keys(errors)
      .filter((key) => key !== 'serverError')
      .forEach((key) => {
        const message = ERROR_MESSAGES[key];
        if (message) {
          errorMessages.push(message);
        }
      });

    return errorMessages;
  }
}

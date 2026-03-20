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

  getErrors(): string[] {
    const errors = this.control().errors;

    if (!errors) return [];

    return Object.keys(errors)
      .map((key) => ERROR_MESSAGES[key])
      .filter(Boolean);
  }
}

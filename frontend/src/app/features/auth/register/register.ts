import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import type { UserCreate } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import {
  hasLowercase,
  hasNumeric,
  hasUppercase,
  passwordMatch,
} from '@core/auth/password.validators';

import { AuthCard } from '@shared/components/auth-card/auth-card';
import { FieldError } from '@shared/components/field-error/field-error';

const ERROR_MESSAGES = {
  EMAIL_REGISTERED: 'Este correo ya está registrado',
  INVALID_EMAIL: 'Revise que el email sea válido',
  SERVER_ERROR: 'Error en el servidor',
  UNEXPECTED_ERROR: 'Ocurrió un error inesperado.',
};

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    RouterLink,
    DividerModule,
    FieldError,
    AuthCard,
  ],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), hasLowercase, hasUppercase, hasNumeric],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatch }
  );

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const formValue = this.form.getRawValue();
    const credentials: UserCreate = {
      email: formValue.email,
      password: formValue.password,
    };

    try {
      await this.authService.register(credentials);

      await this.authService.login(credentials);

      await this.router.navigate(['/onboarding']);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 400) {
          this.errorMessage.set(ERROR_MESSAGES.EMAIL_REGISTERED);
        } else if (error.status === 422) {
          this.errorMessage.set(ERROR_MESSAGES.INVALID_EMAIL);
        } else {
          this.errorMessage.set(ERROR_MESSAGES.SERVER_ERROR);
        }
      } else {
        this.errorMessage.set(ERROR_MESSAGES.UNEXPECTED_ERROR);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.invalid && control.touched);
  }

  isPasswordMismatch(): boolean {
    const confirmPassword = this.form.get('confirmPassword');
    return !!(
      this.form.hasError('passwordMatch') &&
      (confirmPassword?.touched || confirmPassword?.dirty)
    );
  }
}

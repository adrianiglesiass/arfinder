import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
import { ErrorService } from '@core/errors';

import { AuthCard } from '@shared/components/auth-card/auth-card';
import { FieldError } from '@shared/components/field-error/field-error';
import { isControlInvalid } from '@shared/utils/form.utils';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    DividerModule,
    FieldError,
    AuthCard,
  ],
  templateUrl: './register.html',
})
export default class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

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
      const response = await this.authService.register(credentials);
      if (response?.requireEmailVerification) {
        await this.router.navigate(['/verify-email'], {
          queryParams: { email: credentials.email },
        });
        return;
      }
      await this.authService.login(credentials);
      await this.router.navigate(['']);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const { general, fieldErrors } = this.errorService.processError(error);
        this.errorMessage.set(general);
        this.errorService.applyValidationErrors(this.form, fieldErrors);
      } else {
        this.errorMessage.set('Ocurrió un error inesperado al registrarse.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async onRegisterWithGoogle() {
    this.isLoading.set(true);
    try {
      await this.authService.loginWithGoogle();
    } catch {
      this.errorMessage.set('Error al conectar con Google.');
      this.isLoading.set(false);
    }
  }

  isInvalid(controlName: string): boolean {
    return isControlInvalid(this.form, controlName);
  }

  isPasswordMismatch(): boolean {
    const confirmPassword = this.form.get('confirmPassword');
    return !!(
      this.form.hasError('passwordMatch') &&
      (confirmPassword?.touched || confirmPassword?.dirty)
    );
  }
}

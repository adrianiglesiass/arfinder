import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import type { UserCreate } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

import { AuthCard } from '@shared/components/auth-card/auth-card';
import { FieldError } from '@shared/components/field-error/field-error';
import { isControlInvalid } from '@shared/utils/form.utils';

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  SERVER_ERROR: 'Ocurrió un error inesperado al iniciar sesión.',
};

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    FieldError,
    AuthCard,
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      // getRawValue() da el objeto tipado sin necesidad de poner "!"
      const credentials: UserCreate = this.form.getRawValue();

      await this.authService.login(credentials);

      await this.router.navigate(['']);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.errorMessage.set(ERROR_MESSAGES.INVALID_CREDENTIALS);
      } else {
        this.errorMessage.set(ERROR_MESSAGES.SERVER_ERROR);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  isInvalid(controlName: string): boolean {
    return isControlInvalid(this.form, controlName);
  }
}

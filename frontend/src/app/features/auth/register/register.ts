import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ErrorService } from '@core/errors';

import { AuthForm } from '@features/auth/components/auth-form/auth-form';
import type { AuthFormFieldErrors } from '@features/auth/components/auth-form/auth-form';

interface AuthCredentials {
  email: string;
  password: string;
}

@Component({
  selector: 'app-register',
  imports: [AuthForm],
  templateUrl: './register.html',
})
export default class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  fieldErrors = signal<AuthFormFieldErrors>([]);

  async onFormSubmit(formValue: { email: string; password: string }) {
    this.errorMessage.set(null);
    this.fieldErrors.set([]);
    this.isLoading.set(true);

    const credentials: AuthCredentials = {
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
      await this.authService.navigatePostAuth();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const { general, fieldErrors } = this.errorService.processError(error);
        this.errorMessage.set(general);
        this.fieldErrors.set(fieldErrors);
      } else {
        this.errorMessage.set('Ocurrió un error inesperado al registrarse.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSocialAuth() {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await this.authService.loginWithGoogle();
    } catch {
      this.errorMessage.set('Error al conectar con Google.');
      this.isLoading.set(false);
    }
  }
}

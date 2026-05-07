import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

import { AuthService } from '@core/auth/auth.service';
import { ErrorService, isInsForgeError } from '@core/errors';
import { getErrorMessage } from '@core/errors/error-messages';

import { AuthForm } from '@features/auth/components/auth-form/auth-form';

interface AuthCredentials {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [AuthForm],
  templateUrl: './login.html',
})
export default class Login {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  async onFormSubmit(credentials: AuthCredentials) {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await this.authService.login(credentials);
      await this.authService.navigatePostAuth();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const { general } = this.errorService.processError(error);
        this.errorMessage.set(general);
      } else if (isInsForgeError(error) && (error.statusCode === 400 || error.statusCode === 401)) {
        this.errorMessage.set(getErrorMessage('INVALID_CREDENTIALS'));
      } else {
        this.errorMessage.set('Ocurrió un error inesperado al iniciar sesión.');
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

  async onSocialAuthApple() {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await this.authService.loginWithApple();
    } catch {
      this.errorMessage.set('Error al conectar con Apple.');
      this.isLoading.set(false);
    }
  }
}

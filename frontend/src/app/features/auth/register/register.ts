import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import type { UserCreate } from '@core/api/api.models';
import { switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import {
  hasLowercase,
  hasUppercase,
  hasNumeric,
  passwordMatch,
} from '@core/auth/password.validators';
import { FieldError } from '@shared/components/field-error/field-error';
import { AuthCard } from '@shared/components/auth-card/auth-card';

const ERROR_MESSAGES = {
  EMAIL_REGISTERED: 'Este correo ya está registrado',
  INVALID_EMAIL: 'Revise que el email sea válido',
  SERVER_ERROR: 'Error en el servidor',
  INVALID_TOKEN: 'No se recibió un token válido del servidor',
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

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);

    const credentials: UserCreate = {
      email: this.form.value.email!,
      password: this.form.value.password!,
    };

    this.authService
      .register(credentials)
      .pipe(switchMap(() => this.authService.login(credentials)))
      .subscribe({
        next: (res) => {
          if (res && res.access_token) {
            this.authService.setToken(res.access_token);
            this.router.navigate(['']);
          } else {
            this.errorMessage.set(ERROR_MESSAGES.INVALID_TOKEN);
          }
        },
        error: (err) => {
          if (err.status === 400) {
            this.errorMessage.set(ERROR_MESSAGES.EMAIL_REGISTERED);
          } else if (err.status === 422) {
            this.errorMessage.set(ERROR_MESSAGES.INVALID_EMAIL);
          } else {
            this.errorMessage.set(ERROR_MESSAGES.SERVER_ERROR);
          }
        },
      });
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

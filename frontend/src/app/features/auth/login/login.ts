import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import type { UserCreate } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

import { AuthCard } from '@shared/components/auth-card/auth-card';
import { FieldError } from '@shared/components/field-error/field-error';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    RouterLink,
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

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

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

    this.authService.login(credentials).subscribe({
      next: (res) => {
        if (res && res.access_token) {
          this.authService.setToken(res.access_token);
          this.router.navigate(['']);
        } else {
          this.errorMessage.set('No se recibió un token válido del servidor');
        }
      },
      error: () => {
        this.errorMessage.set('Correo o contraseña incorrectos.');
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.invalid && control.touched);
  }
}

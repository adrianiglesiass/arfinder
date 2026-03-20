import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth-service';
import { hasLowercase, hasNumeric, hasUppercase } from '@core/auth/password.validators';
import { UserCreate } from '@core/models/auth-model';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
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
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage: string | null = null;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), hasLowercase, hasUppercase, hasNumeric],
    ],
  });

  onSubmit() {
    if (this.form.valid) {
      this.errorMessage = null;

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
            this.errorMessage = 'No se recibió un token válido del servidor';
          }
        },
        error: () => {
          this.errorMessage = 'Correo o contraseña incorrectos.';
        },
      });
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.invalid && control.touched);
  }
}

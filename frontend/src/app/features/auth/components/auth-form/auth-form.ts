import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import {
  hasLowercase,
  hasNumeric,
  hasUppercase,
  passwordMatch,
} from '@core/auth/password.validators';
import type { FieldValidationError } from '@core/errors/error-response.model';

import { FieldError } from '@shared/components/field-error/field-error';
import { isControlInvalid } from '@shared/utils/form.utils';

import { AuthCard } from '@features/auth/components/auth-card/auth-card';
import { AuthSocialButton } from '@features/auth/components/auth-social-button/auth-social-button';
import { AuthSubmitButton } from '@features/auth/components/auth-submit-button/auth-submit-button';

export type AuthMode = 'login' | 'register';
export interface AuthFormPayload {
  email: string;
  password: string;
  confirmPassword?: string;
}

export type AuthFormFieldErrors = FieldValidationError[];

@Component({
  selector: 'app-auth-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    DividerModule,
    FieldError,
    AuthCard,
    AuthSocialButton,
    AuthSubmitButton,
  ],
  templateUrl: './auth-form.html',
})
export class AuthForm {
  readonly mode = input.required<AuthMode>();
  readonly isLoading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly fieldErrors = input<AuthFormFieldErrors>([]);
  readonly submitted = output<AuthFormPayload>();
  readonly socialAuth = output<void>();
  isRegisterMode = computed(() => this.mode() === 'register');
  submitLabel = computed(() => (this.mode() === 'login' ? 'Iniciar sesión' : 'Registrarse'));
  submitClass = computed(
    () => 'w-full py-4  rounded-2xl! font-semibold text-base mt-2 active:scale-95 transition-all'
  );

  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    confirmPassword: [''],
  });

  constructor() {
    effect(() => {
      this.applyModeValidators();
    });

    effect(() => {
      this.applyFieldErrors();
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue());
  }

  onSocialAuth() {
    this.socialAuth.emit();
  }

  private applyFieldErrors() {
    const errors = this.fieldErrors();

    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (!control) {
        return;
      }

      const existingErrors = control.errors as Record<string, unknown> | null;
      if (existingErrors && existingErrors['serverError']) {
        const rest = { ...existingErrors };
        delete rest['serverError'];
        control.setErrors(Object.keys(rest).length ? rest : null);
      }
    });

    errors.forEach(({ field, message }) => {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ ...control.errors, serverError: message });
        control.markAsTouched();
      }
    });
  }

  isInvalid(controlName: string): boolean {
    return isControlInvalid(this.form, controlName);
  }

  isPasswordMismatch(): boolean {
    const confirmPassword = this.form.get('confirmPassword');
    return !!(
      this.mode() === 'register' &&
      this.form.hasError('passwordMatch') &&
      (confirmPassword?.touched || confirmPassword?.dirty)
    );
  }

  private applyModeValidators() {
    const passwordControl = this.form.get('password');
    const confirmPasswordControl = this.form.get('confirmPassword');

    if (this.mode() === 'register') {
      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(8),
        hasLowercase,
        hasUppercase,
        hasNumeric,
      ]);
      confirmPasswordControl?.setValidators([Validators.required]);
      this.form.setValidators(passwordMatch);
    } else {
      passwordControl?.setValidators([Validators.required]);
      confirmPasswordControl?.clearValidators();
      confirmPasswordControl?.setErrors(null);
      confirmPasswordControl?.setValue('', { emitEvent: false });
      this.form.setValidators(null);
    }

    passwordControl?.updateValueAndValidity({ onlySelf: true });
    confirmPasswordControl?.updateValueAndValidity({ onlySelf: true });
    this.form.updateValueAndValidity();
  }
}

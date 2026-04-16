import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { AuthService } from '@core/auth/auth.service';
import { ErrorService } from '@core/errors';

import { AuthCard } from '@features/auth/components/auth-card/auth-card';

@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule, ButtonModule, MessageModule, AuthCard],
  templateUrl: './verify-email.html',
})
export default class VerifyEmail implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

  inputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  resendLoading = signal<boolean>(false);
  resendDisabled = signal<boolean>(false);
  countdown = signal<number>(0);

  email = input.required<string>();

  form = this.fb.group({
    otp: this.fb.array(
      Array(6)
        .fill('')
        .map(() => new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)]))
    ),
  });

  get otpArray() {
    return this.form.get('otp') as FormArray;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.inputs()[0]?.nativeElement.focus();
    }, 100);
  }

  onInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && index < 5) {
      this.inputs()[index + 1]?.nativeElement.focus();
    }

    if (this.form.valid) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.otpArray.at(index).value && index > 0) {
      this.inputs()[index - 1]?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text').slice(0, 6) || '';
    if (!/^\d+$/.test(pasteData)) return;

    const digits = pasteData.split('');
    digits.forEach((digit, i) => {
      if (i < 6) {
        this.otpArray.at(i).setValue(digit);
      }
    });

    if (this.form.valid) {
      this.onSubmit();
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const otp = this.otpArray.value.join('');

    try {
      await this.authService.verifyEmail(this.email(), otp);
      await this.router.navigate(['']);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const { general } = this.errorService.processError(error);
        this.errorMessage.set(general);
      } else {
        this.errorMessage.set('Código de verificación incorrecto.');
      }
      this.isLoading.set(false);
    }
  }

  async onResend() {
    if (this.resendDisabled()) return;

    this.resendLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.resendVerificationEmail(this.email());
      this.startCountdown();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const { general } = this.errorService.processError(error);
        this.errorMessage.set(general);
      } else {
        this.errorMessage.set('Error al reenviar el código.');
      }
    } finally {
      this.resendLoading.set(false);
    }
  }

  private startCountdown() {
    this.resendDisabled.set(true);
    this.countdown.set(60);

    const interval = setInterval(() => {
      this.countdown.update((c) => c - 1);
      if (this.countdown() <= 0) {
        this.resendDisabled.set(false);
        clearInterval(interval);
      }
    }, 1000);
  }
}

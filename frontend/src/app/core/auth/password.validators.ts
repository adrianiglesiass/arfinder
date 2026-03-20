import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const hasLowercase: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return /[a-z]/.test(value) ? null : { hasLowercase: true };
};

export const hasUppercase: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return /[A-Z]/.test(value) ? null : { hasUppercase: true };
};

export const hasNumeric: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return /\d/.test(value) ? null : { hasNumeric: true };
};

export const passwordMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMatch: true };
};

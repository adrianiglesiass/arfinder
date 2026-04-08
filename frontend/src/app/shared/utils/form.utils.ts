import { FormGroup } from '@angular/forms';

export function isControlInvalid(form: FormGroup, controlName: string): boolean {
  const control = form.get(controlName);
  return !!(control?.invalid && control.touched);
}

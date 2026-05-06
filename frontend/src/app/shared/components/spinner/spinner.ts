import { Component, computed, input } from '@angular/core';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'muted' | 'current';

@Component({
  selector: 'app-spinner',
  template:
    '<span [class]="classes()" role="status" aria-live="polite" aria-label="Cargando"></span>',
})
export class Spinner {
  size = input<SpinnerSize>('md');
  color = input<SpinnerColor>('primary');

  protected readonly classes = computed(
    () => `app-spinner app-spinner--${this.size()} app-spinner--${this.color()}`
  );
}

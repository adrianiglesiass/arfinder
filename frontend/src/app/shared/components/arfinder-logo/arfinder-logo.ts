import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-arfinder-logo',
  templateUrl: './arfinder-logo.html',
  host: { '[class]': 'sizeClass()' },
})
export class ArfinderLogo {
  size = input<'sm' | 'md' | 'lg'>('md');

  sizeClass = computed(
    () =>
      ({
        sm: 'text-xl',
        md: 'text-3xl',
        lg: 'text-4xl',
      })[this.size()]
  );
}

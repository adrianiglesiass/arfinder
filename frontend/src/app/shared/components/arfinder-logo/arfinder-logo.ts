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
        sm: 'text-2xl',
        md: 'text-4xl',
        lg: 'text-5xl',
      })[this.size()]
  );
}

import { Component, computed, input } from '@angular/core';

import { Spinner } from '@shared/components/spinner/spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

@Component({
  selector: 'app-button',
  imports: [Spinner],
  templateUrl: './button.html',
  host: {
    class: 'inline-block',
  },
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  loading = input(false);
  disabled = input(false);
  type = input<'button' | 'submit'>('button');

  protected readonly buttonClasses = computed(() => {
    const base =
      'w-full inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100';

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-5 py-2.5 text-[12px]',
      md: 'px-8 py-3.5 text-[13px]',
    };

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-white font-bold hover:opacity-90 active:opacity-80',
      secondary:
        'bg-white text-gray-700 border border-gray-200 font-semibold hover:bg-gray-50 active:bg-gray-100',
      ghost: 'text-gray-400 font-bold hover:text-primary active:text-primary',
    };

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}`;
  });
}

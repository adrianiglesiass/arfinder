import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconButtonVariant = 'outline' | 'toggle';
export type IconButtonSize = 'sm' | 'md';
export type IconButtonShape = 'square' | 'circle';

@Component({
  selector: 'app-icon-button',
  templateUrl: './icon-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
})
export class IconButton {
  readonly variant = input<IconButtonVariant>('outline');
  readonly size = input<IconButtonSize>('md');
  readonly shape = input<IconButtonShape>('square');
  readonly active = input(false);
  readonly disabled = input(false);
  readonly label = input.required<string>();

  protected readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 disabled:active:scale-100';
    const size = this.size() === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
    const shape = this.shape() === 'circle' ? 'rounded-full' : '';
    const variant =
      this.variant() === 'toggle'
        ? this.active()
          ? 'bg-primary text-white'
          : 'text-gray-400 hover:text-primary'
        : 'border border-gray-border text-primary hover:border-primary disabled:opacity-25';
    return `${base} ${size} ${shape} ${variant}`;
  });
}

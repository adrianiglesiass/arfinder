import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly src = input<string | null>(null);
  readonly alt = input<string>('Avatar');
  readonly size = input<AvatarSize>('md');

  protected readonly sizeClass = computed(() => {
    const map: Record<AvatarSize, string> = {
      sm: 'w-9 h-9',
      md: 'w-11 h-11',
      lg: 'w-14 h-14',
    };
    return map[this.size()];
  });

  protected readonly iconSizeClass = computed(() => {
    const map: Record<AvatarSize, string> = {
      sm: 'text-base',
      md: 'text-xl',
      lg: 'text-2xl',
    };
    return map[this.size()];
  });
}

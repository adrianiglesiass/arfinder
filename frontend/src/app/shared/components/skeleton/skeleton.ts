import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonShape = 'bar' | 'circle' | 'rect';

@Component({
  selector: 'app-skeleton',
  template: `<div [class]="classes()"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('rect');
  readonly size = input<string>('');

  protected readonly classes = computed(() => {
    const base = 'bg-gray-200 animate-pulse';
    const shapeMap: Record<SkeletonShape, string> = {
      bar: 'rounded-full',
      circle: 'rounded-full aspect-square',
      rect: 'rounded-2xl',
    };
    return `${base} ${shapeMap[this.shape()]} ${this.size()}`;
  });
}

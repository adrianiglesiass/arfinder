import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { BlockService } from '@core/block/block.service';

@Component({
  selector: 'app-block-button',
  templateUrl: './block-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class BlockButton {
  private readonly blocks = inject(BlockService);

  readonly profileId = input.required<number>();
  readonly compact = input(false);

  protected readonly isBlocked = computed(() => this.blocks.blockedIds().has(this.profileId()));

  protected readonly sizeClasses = computed(() =>
    this.compact() ? 'w-10 h-10 shrink-0' : 'w-full px-4 py-2.5'
  );

  protected readonly colorClasses = computed(() =>
    this.isBlocked()
      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
      : 'border-gray-200 bg-white text-gray-500 hover:text-red-600 hover:border-red-200'
  );

  protected toggle(event: Event): void {
    event.stopPropagation();
    void this.blocks.toggle(this.profileId());
  }
}

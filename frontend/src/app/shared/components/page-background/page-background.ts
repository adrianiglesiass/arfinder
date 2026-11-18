import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PageBackgroundAlign = 'center' | 'start';

/**
 * Full height canvas shared by every public screen: white background, the two blurred brand blobs
 * and the vertical placement of the content.
 */
@Component({
  selector: 'app-page-background',
  templateUrl: './page-background.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PageBackground {
  /** `start` keeps the content at the top, which screens reserving bottom space need. */
  readonly align = input<PageBackgroundAlign>('center');

  protected readonly containerClass = computed(() =>
    this.align() === 'start'
      ? 'min-h-screen bg-white flex flex-col items-center p-6 lg:p-8 relative overflow-hidden'
      : 'min-h-screen bg-white flex flex-col items-center justify-center p-6 lg:p-8 relative overflow-hidden'
  );
}

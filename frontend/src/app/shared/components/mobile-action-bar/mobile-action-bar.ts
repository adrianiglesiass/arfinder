import { ChangeDetectionStrategy, Component, DestroyRef, inject, input } from '@angular/core';

import { MobileActionBarState } from '@core/layout/mobile-action-bar.state';

@Component({
  selector: 'app-mobile-action-bar',
  templateUrl: './mobile-action-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class MobileActionBar {
  readonly label = input.required<string>();

  constructor() {
    const state = inject(MobileActionBarState);
    state.register();
    inject(DestroyRef).onDestroy(() => state.unregister());
  }
}

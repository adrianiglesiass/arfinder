import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-nav-badge',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'absolute -top-1 -right-2 inline-flex items-center justify-center min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold leading-none rounded-full border border-white',
  },
})
export class NavBadge {}

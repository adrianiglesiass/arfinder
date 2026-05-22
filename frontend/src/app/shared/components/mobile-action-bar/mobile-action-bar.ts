import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-mobile-action-bar',
  templateUrl: './mobile-action-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class MobileActionBar {
  readonly label = input.required<string>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-profile-photo',
  templateUrl: './profile-photo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ProfilePhoto {
  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly imgClass = input('');
}

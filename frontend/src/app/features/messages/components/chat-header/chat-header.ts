import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ROUTES } from '@core/constants/routes';

import { Avatar } from '@shared/components/avatar/avatar';

import type { ChatHeader as ChatHeaderInfo } from '@features/messages/messages.types';

@Component({
  selector: 'app-chat-header',
  imports: [RouterLink, Avatar],
  templateUrl: './chat-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeader {
  readonly header = input<ChatHeaderInfo | null>(null);
  readonly back = output<void>();

  protected readonly profileRoute = ROUTES.PROFILE_DETAIL;

  onBack(): void {
    this.back.emit();
  }
}

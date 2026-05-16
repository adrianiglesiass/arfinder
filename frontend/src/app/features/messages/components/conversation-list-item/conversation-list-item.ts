import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { ConversationResponse } from '@core/api/api.models';

import { Avatar } from '@shared/components/avatar/avatar';

@Component({
  selector: 'app-conversation-list-item',
  imports: [Avatar],
  templateUrl: './conversation-list-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationListItem {
  readonly conversation = input.required<ConversationResponse>();
  readonly isSelected = input<boolean>(false);
  readonly lastMessageTime = input<string>('');
  readonly lastMessagePreview = input<string>('');

  readonly selected = output<ConversationResponse>();

  onClick(): void {
    this.selected.emit(this.conversation());
  }
}

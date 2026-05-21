import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { MessageResponse } from '@core/api/api.models';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBubble {
  readonly message = input.required<MessageResponse>();
  readonly isOwn = input.required<boolean>();
  readonly hasTail = input.required<boolean>();
  readonly isShort = input.required<boolean>();
  readonly time = input.required<string>();

  protected readonly bubbleClass = computed(() => {
    const tail = this.hasTail();
    if (this.isOwn()) {
      return `bg-chat-sent text-white ${tail ? 'rounded-br-none' : 'rounded-br-sm'}`;
    }
    return `bg-chat-received text-gray-900 ${tail ? 'rounded-bl-none' : 'rounded-bl-sm'}`;
  });

  protected readonly metaClass = computed(() => (this.isOwn() ? 'text-white/70' : 'text-gray-500'));
}

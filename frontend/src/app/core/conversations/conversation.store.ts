import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';

import type { ConversationResponse, MessageResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { RealtimeService } from '@core/realtime/realtime.service';

const RECENT_IDS_LIMIT = 200;

@Injectable({
  providedIn: 'root',
})
export class ConversationStore {
  private readonly api = inject(ConversationApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);

  readonly conversations = signal<ConversationResponse[]>([]);
  readonly totalUnread = computed(() =>
    this.conversations().reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  );
  readonly activeConversationId = signal<number | null>(null);

  private initializing: Promise<void> | null = null;
  private currentUserId: number | null = null;
  private readonly recentMessageIds: number[] = [];
  private readonly recentMessageIdsSet = new Set<number>();

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const id = user?.id ?? null;
      if (id !== this.currentUserId) {
        this.currentUserId = id;
        if (id != null) void this.bootstrap();
        else this.reset();
      }
    });

    this.realtime.addMessageHandler((convId, msg) => this.onIncomingMessage(convId, msg));
    this.realtime.addConversationCreatedHandler(() => void this.refresh());
  }

  async refresh(): Promise<void> {
    if (!this.auth.currentUser()) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      try {
        await this.realtime.connect();
        const list = await this.api.list();
        this.conversations.set(list);
        const ids = list.map((c) => c.id);
        if (ids.length) await this.realtime.subscribeConversations(ids);
      } catch {
        //
      } finally {
        this.initializing = null;
      }
    })();
    return this.initializing;
  }

  setActiveConversation(conversationId: number | null): void {
    this.activeConversationId.set(conversationId);
    if (conversationId != null) this.markConversationOpened(conversationId);
  }

  markConversationOpened(conversationId: number): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  }

  upsertConversationPreview(conversationId: number, message: MessageResponse): void {
    this.rememberMessageId(message.id);
    this.conversations.update((list) => {
      const idx = list.findIndex((c) => c.id === conversationId);
      if (idx === -1) return list;
      const updated: ConversationResponse = {
        ...list[idx],
        last_message: {
          content: message.content,
          sent_at: message.sent_at,
          is_read: message.is_read,
        },
      };
      const next = list.slice();
      next.splice(idx, 1);
      next.unshift(updated);
      return next;
    });
  }

  private bootstrap(): Promise<void> {
    return this.refresh();
  }

  private reset(): void {
    this.realtime.unsubscribeAll();
    this.conversations.set([]);
    this.recentMessageIds.length = 0;
    this.recentMessageIdsSet.clear();
  }

  private onIncomingMessage(conversationId: number, message: MessageResponse): void {
    if (!Number.isFinite(message.id)) return;
    if (this.recentMessageIdsSet.has(message.id)) return;
    this.rememberMessageId(message.id);

    const me = this.currentUserId;
    const isMine = me != null && Number(me) === Number(message.sender_id);
    const isActive = this.activeConversationId() === conversationId;
    const skipUnread = isMine || isActive;

    this.conversations.update((list) => {
      const idx = list.findIndex((c) => c.id === conversationId);
      if (idx === -1) return list;
      const current = list[idx];
      const updated: ConversationResponse = {
        ...current,
        last_message: {
          content: message.content,
          sent_at: message.sent_at,
          is_read: message.is_read,
        },
        unread_count: skipUnread ? current.unread_count : (current.unread_count ?? 0) + 1,
      };
      const next = list.slice();
      next.splice(idx, 1);
      next.unshift(updated);
      return next;
    });
  }

  private rememberMessageId(id: number): void {
    if (this.recentMessageIdsSet.has(id)) return;
    this.recentMessageIds.push(id);
    this.recentMessageIdsSet.add(id);
    while (this.recentMessageIds.length > RECENT_IDS_LIMIT) {
      const dropped = this.recentMessageIds.shift();
      if (dropped !== undefined) this.recentMessageIdsSet.delete(dropped);
    }
  }
}

import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';

import type { ConversationResponse, MessageResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { ConversationStore } from '@core/conversations/conversation.store';
import { RealtimeService } from '@core/realtime/realtime.service';

interface DraftRecipient {
  user_id: number;
  name: string | null;
  photo_url: string | null;
}

interface ChatHeader {
  name: string;
  photo_url: string | null;
}

@Component({
  selector: 'app-messages',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './messages.html',
})
export default class Messages implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly conversationApi = inject(ConversationApiService);
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly store = inject(ConversationStore);

  readonly conversations = this.store.conversations;
  selectedConversation = signal<ConversationResponse | null>(null);
  draftRecipient = signal<DraftRecipient | null>(null);
  messages = signal<MessageResponse[]>([]);
  newMessage = signal('');
  isLoading = signal(true);

  readonly myUserId = computed(() => {
    const id = this.authService.currentUser()?.id;
    return typeof id === 'number' ? id : null;
  });

  readonly chatActive = computed(
    () => this.selectedConversation() !== null || this.draftRecipient() !== null
  );

  readonly headerInfo = computed<ChatHeader | null>(() => {
    const conv = this.selectedConversation();
    if (conv?.other_user) {
      return {
        name: conv.other_user.name ?? 'Usuario',
        photo_url: conv.other_user.photo_url ?? null,
      };
    }
    const draft = this.draftRecipient();
    if (draft) {
      return { name: draft.name ?? 'Usuario', photo_url: draft.photo_url };
    }
    return null;
  });

  private unsubMessage: (() => void) | null = null;
  private unsubRead: (() => void) | null = null;
  private selectionEpoch = 0;

  constructor() {
    afterNextRender(() => this.scrollToBottom());
  }

  async ngOnInit(): Promise<void> {
    await this.store.refresh();
    this.isLoading.set(false);

    this.unsubMessage = this.realtimeService.addMessageHandler((convId, msg) =>
      this.onMessageForActive(convId, msg)
    );
    this.unsubRead = this.realtimeService.addReadHandler((convId, msgId, isRead, readAt) =>
      this.onReadForActive(convId, msgId, isRead, readAt)
    );

    const params = this.route.snapshot.queryParamMap;
    const conversationId = params.get('conversation');
    const recipient = params.get('recipient');

    if (conversationId) {
      const convId = Number(conversationId);
      if (!Number.isNaN(convId)) {
        const conv = this.conversations().find((c) => c.id === convId);
        if (conv) await this.selectConversation(conv);
      }
      return;
    }

    if (recipient) {
      const recipientId = Number(recipient);
      if (Number.isNaN(recipientId)) return;
      const existing = this.conversations().find((c) => c.other_user?.user_id === recipientId);
      if (existing) {
        await this.selectConversation(existing);
        return;
      }
      const navState = (history.state ?? {}) as { recipient?: DraftRecipient };
      this.draftRecipient.set(
        navState.recipient?.user_id === recipientId
          ? navState.recipient
          : { user_id: recipientId, name: null, photo_url: null }
      );
      this.messages.set([]);
    }
  }

  ngOnDestroy(): void {
    this.unsubMessage?.();
    this.unsubRead?.();
    this.store.setActiveConversation(null);
  }

  closeConversation(): void {
    this.selectionEpoch++;
    this.store.setActiveConversation(null);
    this.selectedConversation.set(null);
    this.draftRecipient.set(null);
    this.messages.set([]);
  }

  async selectConversation(conv: ConversationResponse): Promise<void> {
    const epoch = ++this.selectionEpoch;
    this.draftRecipient.set(null);
    this.selectedConversation.set(conv);
    this.messages.set([]);
    this.store.setActiveConversation(conv.id);
    void this.realtimeService.subscribeConversation(conv.id);

    try {
      const msgs = await this.conversationApi.getMessages(conv.id);
      if (epoch !== this.selectionEpoch) return;
      this.messages.set(msgs);
      await this.conversationApi.markAsRead(conv.id);
      setTimeout(() => this.scrollToBottom(), 50);
    } catch {
      /* empty */
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.newMessage().trim();
    if (!content) return;

    const conv = this.selectedConversation();
    const draft = this.draftRecipient();
    const meId = this.myUserId();
    if (!conv && !draft) return;
    if (meId == null) return;

    const tempId = -(Date.now() + Math.floor(Math.random() * 1000));
    const optimistic: MessageResponse = {
      id: tempId,
      conversation_id: conv?.id ?? -1,
      sender_id: meId,
      content,
      sent_at: new Date().toISOString(),
      is_read: false,
      read_at: null,
    };

    this.messages.update((msgs) => [...msgs, optimistic]);
    this.newMessage.set('');
    setTimeout(() => this.scrollToBottom(), 50);

    try {
      const real = conv
        ? await this.conversationApi.sendMessage(conv.id, content)
        : await this.conversationApi.sendMessageToUser(draft!.user_id, content);

      this.replaceOptimistic(tempId, real);

      if (conv) {
        this.store.upsertConversationPreview(conv.id, real);
      } else {
        await this.adoptNewConversation(real, draft!);
      }
    } catch {
      this.removeOptimistic(tempId);
      this.newMessage.set(content);
    }
  }

  isMyMessage(senderId: number | null | undefined): boolean {
    const me = this.myUserId();
    if (me == null || senderId == null) return false;
    return Number(me) === Number(senderId);
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getLastMessagePreview(conv: ConversationResponse): string {
    return conv.last_message?.content ?? 'Sin mensajes';
  }

  getLastMessageTime(conv: ConversationResponse): string {
    if (!conv.last_message?.sent_at) return '';
    return this.formatTime(conv.last_message.sent_at);
  }

  private async adoptNewConversation(real: MessageResponse, draft: DraftRecipient): Promise<void> {
    await this.store.refresh();
    const created = this.conversations().find((c) => c.id === real.conversation_id);
    if (created) {
      this.draftRecipient.set(null);
      this.selectedConversation.set(created);
      this.store.setActiveConversation(created.id);
      void this.realtimeService.subscribeConversation(created.id);
      return;
    }
    const me = this.myUserId() ?? 0;
    const fallback: ConversationResponse = {
      id: real.conversation_id,
      user1_id: Math.min(me, draft.user_id),
      user2_id: Math.max(me, draft.user_id),
      other_user: {
        user_id: draft.user_id,
        name: draft.name ?? 'Usuario',
        photo_url: draft.photo_url,
      },
      last_message: {
        content: real.content,
        sent_at: real.sent_at,
        is_read: real.is_read,
      },
      unread_count: 0,
    };
    this.draftRecipient.set(null);
    this.selectedConversation.set(fallback);
    this.store.setActiveConversation(fallback.id);
    void this.realtimeService.subscribeConversation(fallback.id);
  }

  private replaceOptimistic(tempId: number, real: MessageResponse): void {
    this.messages.update((msgs) => {
      const filtered = msgs.filter((m) => m.id !== tempId);
      const idx = filtered.findIndex((m) => m.id === real.id);
      if (idx === -1) return [...filtered, real];
      const next = filtered.slice();
      next[idx] = { ...filtered[idx], ...real };
      return next;
    });
  }

  private removeOptimistic(tempId: number): void {
    this.messages.update((msgs) => msgs.filter((m) => m.id !== tempId));
  }

  private onMessageForActive(conversationId: number, message: MessageResponse): void {
    if (this.selectedConversation()?.id !== conversationId) return;
    this.upsertMessage(message);
    setTimeout(() => this.scrollToBottom(), 50);

    if (!this.isMyMessage(message.sender_id)) {
      void this.conversationApi.markAsRead(conversationId).catch(() => undefined);
    }
  }

  private onReadForActive(
    conversationId: number,
    messageId: number,
    isRead: boolean,
    readAt: string | null
  ): void {
    if (this.selectedConversation()?.id !== conversationId) return;
    this.messages.update((msgs) =>
      msgs.map((m) =>
        m.id === messageId ? { ...m, is_read: isRead, read_at: readAt ?? m.read_at } : m
      )
    );
  }

  private upsertMessage(message: MessageResponse): void {
    this.messages.update((msgs) => {
      const idx = msgs.findIndex((m) => m.id === message.id);
      if (idx === -1) return [...msgs, message];
      const merged = { ...msgs[idx], ...message };
      const next = msgs.slice();
      next[idx] = merged;
      return next;
    });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}

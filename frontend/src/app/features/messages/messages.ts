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
  messages = signal<MessageResponse[]>([]);
  newMessage = signal('');
  isLoading = signal(true);
  isSending = signal(false);

  readonly myUserId = computed(() => {
    const id = this.authService.currentUser()?.id;
    return typeof id === 'number' ? id : null;
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

    const conversationId = this.route.snapshot.queryParamMap.get('conversation');
    if (conversationId) {
      const convId = Number(conversationId);
      if (!Number.isNaN(convId)) {
        const conv = this.conversations().find((c) => c.id === convId);
        if (conv) await this.selectConversation(conv);
      }
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
    this.messages.set([]);
  }

  async selectConversation(conv: ConversationResponse): Promise<void> {
    const epoch = ++this.selectionEpoch;
    this.selectedConversation.set(conv);
    this.messages.set([]);
    this.store.setActiveConversation(conv.id);
    void this.realtimeService.subscribeConversation(conv.id);

    try {
      const msgs = await this.conversationApi.getMessages(conv.id);
      if (epoch !== this.selectionEpoch) return;
      this.messages.set(msgs);

      const me = this.myUserId();
      const justReadIds = msgs.filter((m) => !m.is_read && m.sender_id !== me).map((m) => m.id);
      await this.conversationApi.markAsRead(conv.id);
      if (justReadIds.length) {
        void this.realtimeService.publishRead(conv.id, justReadIds);
      }

      setTimeout(() => this.scrollToBottom(), 50);
    } catch {
      /* empty */
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.newMessage().trim();
    const conv = this.selectedConversation();
    if (!content || !conv) return;

    this.isSending.set(true);
    try {
      const msg = await this.conversationApi.sendMessage(conv.id, content);
      this.upsertMessage(msg);
      this.store.upsertConversationPreview(conv.id, msg);
      void this.realtimeService.publishMessage(conv.id, msg);
      this.newMessage.set('');
      setTimeout(() => this.scrollToBottom(), 50);
    } catch {
      /* empty */
    } finally {
      this.isSending.set(false);
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

  private onMessageForActive(conversationId: number, message: MessageResponse): void {
    if (this.selectedConversation()?.id !== conversationId) return;
    this.upsertMessage(message);
    setTimeout(() => this.scrollToBottom(), 50);

    if (!this.isMyMessage(message.sender_id)) {
      void this.conversationApi
        .markAsRead(conversationId)
        .then(() => this.realtimeService.publishRead(conversationId, [message.id]))
        .catch(() => undefined);
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

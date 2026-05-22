import { Location } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';

import type { ConversationResponse, MessageResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { ROUTES } from '@core/constants/routes';
import { ConversationStore } from '@core/conversations/conversation.store';
import { RealtimeService } from '@core/realtime/realtime.service';

import { Spinner } from '@shared/components/spinner/spinner';

import { ChatHeader as ChatHeaderComponent } from '@features/messages/components/chat-header/chat-header';
import { ConversationListItem } from '@features/messages/components/conversation-list-item/conversation-list-item';
import { MessageBubble } from '@features/messages/components/message-bubble/message-bubble';
import { MessageComposer } from '@features/messages/components/message-composer/message-composer';
import type { ChatHeader, DraftRecipient } from '@features/messages/messages.types';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-messages',
  imports: [
    RouterLink,
    Spinner,
    ConversationListItem,
    ChatHeaderComponent,
    MessageBubble,
    MessageComposer,
  ],
  templateUrl: './messages.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Messages implements OnInit {
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private readonly topSentinel = viewChild<ElementRef<HTMLDivElement>>('topSentinel');
  private readonly composer = viewChild(MessageComposer);

  protected readonly exploreRoute = ROUTES.EXPLORE;

  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly conversationApi = inject(ConversationApiService);
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly store = inject(ConversationStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = this.store.conversations;
  selectedConversation = signal<ConversationResponse | null>(null);
  draftRecipient = signal<DraftRecipient | null>(null);
  messages = signal<MessageResponse[]>([]);
  newMessage = signal('');
  isLoading = signal(true);
  hasMoreMessages = signal(false);
  isLoadingOlder = signal(false);
  initialScrollDone = signal(false);

  readonly myUserId = computed(() => {
    const id = this.authService.currentUser()?.id;
    return typeof id === 'number' ? id : null;
  });

  readonly chatActive = computed(
    () => this.selectedConversation() !== null || this.draftRecipient() !== null
  );

  viewportHeight = signal<number | null>(null);
  viewportOffsetTop = signal(0);
  isMobile = signal(false);

  private isAtBottom = signal(true);
  private readonly bottomThresholdPx = 80;
  private containerScrollCleanup: (() => void) | null = null;

  readonly mobileChatHeightPx = computed(() => {
    if (!this.chatActive() || !this.isMobile()) return null;
    return this.viewportHeight();
  });

  readonly mobileChatTopPx = computed(() => {
    if (!this.chatActive() || !this.isMobile()) return null;
    return this.viewportOffsetTop();
  });

  readonly headerInfo = computed<ChatHeader | null>(() => {
    const conv = this.selectedConversation();
    if (conv?.other_user) {
      return {
        name: conv.other_user.name ?? 'Usuario',
        photo_url: conv.other_user.photo_url ?? null,
        profile_id: conv.other_user.profile_id ?? null,
      };
    }
    const draft = this.draftRecipient();
    if (draft) {
      return {
        name: draft.name ?? 'Usuario',
        photo_url: draft.photo_url,
        profile_id: draft.profile_id,
      };
    }
    return null;
  });

  private unsubMessage: (() => void) | null = null;
  private unsubRead: (() => void) | null = null;
  private cleanupViewport: (() => void) | null = null;
  private cleanupMq: (() => void) | null = null;
  private selectionEpoch = 0;
  private intersectionObserver: IntersectionObserver | null = null;
  private observedSentinel: HTMLElement | null = null;
  private bodyLockState: {
    scrollY: number;
    position: string;
    top: string;
    left: string;
    right: string;
    width: string;
    overflow: string;
  } | null = null;

  constructor() {
    afterNextRender(() => this.scrollToBottom());
    effect(() => {
      const active = this.chatActive();
      const hasMore = this.hasMoreMessages();
      const ready = this.initialScrollDone();
      queueMicrotask(() => this.syncSentinelObserver(active && hasMore && ready));
    });
    effect(() => {
      const shouldLock = this.chatActive() && this.isMobile();
      queueMicrotask(() => this.setBodyScrollLock(shouldLock));
    });
  }

  async ngOnInit(): Promise<void> {
    this.setupViewportTracking();
    this.registerCleanup();

    await this.store.refresh();
    this.isLoading.set(false);

    this.unsubMessage = this.realtimeService.addMessageHandler((convId, msg) =>
      this.onMessageForActive(convId, msg)
    );
    this.unsubRead = this.realtimeService.addReadHandler((convId, msgId, isRead, readAt) =>
      this.onReadForActive(convId, msgId, isRead, readAt)
    );

    const conversationId = this.route.snapshot.paramMap.get('conversationId');
    const recipient = this.route.snapshot.queryParamMap.get('recipient');

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
          : { user_id: recipientId, profile_id: null, name: null, photo_url: null }
      );
      this.messages.set([]);
    }
  }

  private registerCleanup(): void {
    this.destroyRef.onDestroy(() => {
      this.unsubMessage?.();
      this.unsubRead?.();
      this.cleanupViewport?.();
      this.cleanupMq?.();
      this.disconnectIntersectionObserver();
      this.containerScrollCleanup?.();
      this.setBodyScrollLock(false);
      this.store.setActiveConversation(null);
    });
  }

  private setupViewportTracking(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mq = window.matchMedia('(max-width: 767px)');
    this.isMobile.set(mq.matches);
    const onMqChange = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
    mq.addEventListener('change', onMqChange);
    this.cleanupMq = () => mq.removeEventListener('change', onMqChange);

    const vv = window.visualViewport;
    if (!vv) {
      this.viewportHeight.set(window.innerHeight);
      this.viewportOffsetTop.set(0);
      return;
    }

    const update = () => {
      this.viewportHeight.set(vv.height);
      this.viewportOffsetTop.set(vv.offsetTop);
      if (this.initialScrollDone() && this.isAtBottom()) {
        requestAnimationFrame(() => this.scrollToBottom());
      }
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    this.cleanupViewport = () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }

  private setBodyScrollLock(lock: boolean): void {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) return;

    if (lock) {
      if (this.bodyLockState) return;
      const scrollY = window.scrollY;
      this.bodyLockState = {
        scrollY,
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
      };
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    } else {
      const state = this.bodyLockState;
      if (!state) return;
      body.style.position = state.position;
      body.style.top = state.top;
      body.style.left = state.left;
      body.style.right = state.right;
      body.style.width = state.width;
      body.style.overflow = state.overflow;
      window.scrollTo(0, state.scrollY);
      this.bodyLockState = null;
    }
  }

  closeConversation(): void {
    this.selectionEpoch++;
    this.store.setActiveConversation(null);
    this.location.go(ROUTES.MESSAGES);
    this.selectedConversation.set(null);
    this.draftRecipient.set(null);
    this.messages.set([]);
    this.hasMoreMessages.set(false);
    this.isLoadingOlder.set(false);
    this.initialScrollDone.set(false);
    this.containerScrollCleanup?.();
    this.containerScrollCleanup = null;
    this.isAtBottom.set(true);
  }

  async selectConversation(conv: ConversationResponse): Promise<void> {
    const epoch = ++this.selectionEpoch;
    this.containerScrollCleanup?.();
    this.containerScrollCleanup = null;
    this.isAtBottom.set(true);
    this.draftRecipient.set(null);
    this.selectedConversation.set(conv);
    this.messages.set([]);
    this.hasMoreMessages.set(false);
    this.isLoadingOlder.set(false);
    this.initialScrollDone.set(false);
    this.store.setActiveConversation(conv.id);
    this.location.go(`${ROUTES.MESSAGES}/${conv.id}`);
    void this.realtimeService.subscribeConversation(conv.id);

    try {
      const msgs = await this.conversationApi.getMessages(conv.id, { limit: PAGE_SIZE });
      if (epoch !== this.selectionEpoch) return;
      this.messages.set(msgs);
      this.hasMoreMessages.set(msgs.length === PAGE_SIZE);
      void this.conversationApi.markAsRead(conv.id);

      this.scrollToBottomSettled(epoch);
    } catch {
      /* empty */
    }
  }

  async loadOlderMessages(): Promise<void> {
    if (!this.initialScrollDone()) return;
    if (this.isLoadingOlder() || !this.hasMoreMessages()) return;
    const conv = this.selectedConversation();
    if (!conv) return;
    const firstReal = this.messages().find((m) => m.id > 0);
    if (!firstReal) return;

    const epoch = this.selectionEpoch;
    this.isLoadingOlder.set(true);

    const container = this.messagesContainer()?.nativeElement;
    const prevHeight = container?.scrollHeight ?? 0;
    const prevTop = container?.scrollTop ?? 0;

    try {
      const older = await this.conversationApi.getMessages(conv.id, {
        beforeId: firstReal.id,
        limit: PAGE_SIZE,
      });
      if (epoch !== this.selectionEpoch) return;

      if (older.length < PAGE_SIZE) this.hasMoreMessages.set(false);
      if (older.length === 0) return;

      this.messages.update((msgs) => [...older, ...msgs]);

      requestAnimationFrame(() => {
        const el = this.messagesContainer()?.nativeElement;
        if (!el) return;
        el.scrollTop = el.scrollHeight - prevHeight + prevTop;
      });
    } catch {
      /* empty */
    } finally {
      if (epoch === this.selectionEpoch) this.isLoadingOlder.set(false);
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
    this.composer()?.resetHeight();
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

  isShortMessage(content: string): boolean {
    if (!content) return true;
    if (content.includes('\n')) return false;
    return content.trim().length <= 28;
  }

  hasTail(index: number): boolean {
    const list = this.messages();
    const current = list[index];
    if (!current) return false;
    const next = list[index + 1];
    return !next || next.sender_id !== current.sender_id;
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
      this.location.go(`${ROUTES.MESSAGES}/${created.id}`);
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
    this.location.go(`${ROUTES.MESSAGES}/${fallback.id}`);
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
    const el = this.messagesContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private bindContainerScroll(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (!el || this.containerScrollCleanup) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      this.isAtBottom.set(dist <= this.bottomThresholdPx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    this.containerScrollCleanup = () => el.removeEventListener('scroll', onScroll);
  }

  private scrollToBottomSettled(epoch: number): void {
    requestAnimationFrame(() => {
      if (epoch !== this.selectionEpoch) return;
      this.bindContainerScroll();
      this.scrollToBottom();
      requestAnimationFrame(() => {
        if (epoch !== this.selectionEpoch) return;
        this.scrollToBottom();
        this.isAtBottom.set(true);
        this.initialScrollDone.set(true);
      });
    });
  }

  private syncSentinelObserver(shouldObserve: boolean): void {
    const sentinel = this.topSentinel()?.nativeElement ?? null;
    const root = this.messagesContainer()?.nativeElement ?? null;

    if (!shouldObserve || !sentinel || !root) {
      this.disconnectIntersectionObserver();
      return;
    }

    if (this.observedSentinel === sentinel && this.intersectionObserver) return;

    this.disconnectIntersectionObserver();
    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void this.loadOlderMessages();
        }
      },
      { root, rootMargin: '120px 0px 0px 0px', threshold: 0 }
    );
    this.intersectionObserver.observe(sentinel);
    this.observedSentinel = sentinel;
  }

  private disconnectIntersectionObserver(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.observedSentinel = null;
  }
}

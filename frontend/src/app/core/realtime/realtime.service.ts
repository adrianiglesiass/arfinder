import { inject, Injectable, signal } from '@angular/core';

import { environment } from '@env/environment';

import type { MessageResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

type MessageHandler = (conversationId: number, message: MessageResponse) => void;
type ReadHandler = (
  conversationId: number,
  messageId: number,
  isRead: boolean,
  readAt: string | null
) => void;

interface ServerEvent {
  event?: string;
  conversation_id?: number;
  payload?: Record<string, unknown> | null;
  error?: string;
}

const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private readonly authService = inject(AuthService);

  private socket: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private readonly subscribedConversations = new Set<number>();
  private readonly pendingSubscriptions = new Set<number>();
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly readHandlers = new Set<ReadHandler>();
  private reconnectDelay = RECONNECT_INITIAL_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  isConnected = signal(false);

  addMessageHandler(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  addReadHandler(handler: ReadHandler): () => void {
    this.readHandlers.add(handler);
    return () => this.readHandlers.delete(handler);
  }

  async subscribeConversations(conversationIds: number[]): Promise<void> {
    await this.ensureSocket();
    for (const id of conversationIds) this.requestSubscribe(id);
  }

  async subscribeConversation(conversationId: number): Promise<void> {
    await this.ensureSocket();
    this.requestSubscribe(conversationId);
  }

  unsubscribeConversation(conversationId: number): void {
    this.subscribedConversations.delete(conversationId);
    this.pendingSubscriptions.delete(conversationId);
    this.send({ action: 'unsubscribe', conversation_id: conversationId });
  }

  unsubscribeAll(): void {
    for (const id of this.subscribedConversations) {
      this.send({ action: 'unsubscribe', conversation_id: id });
    }
    this.subscribedConversations.clear();
    this.pendingSubscriptions.clear();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* empty */
      }
      this.socket = null;
    }
    this.subscribedConversations.clear();
    this.pendingSubscriptions.clear();
    this.isConnected.set(false);
  }

  private async ensureSocket(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;

    this.manuallyClosed = false;
    this.connecting = this.openSocket().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private async openSocket(): Promise<void> {
    const token = await this.authService.getToken();
    if (!token) return;

    const url = this.buildUrl(token);
    const socket = new WebSocket(url);
    this.socket = socket;

    await new Promise<void>((resolve) => {
      const onOpen = () => {
        this.isConnected.set(true);
        this.reconnectDelay = RECONNECT_INITIAL_MS;
        this.flushPendingSubscriptions();
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('error', onError);
        resolve();
      };
      socket.addEventListener('open', onOpen);
      socket.addEventListener('error', onError);
    });

    socket.addEventListener('message', (ev) => this.handleMessage(ev));
    socket.addEventListener('close', () => this.handleClose());
  }

  private buildUrl(token: string): string {
    const apiUrl = new URL(environment.APIURL);
    const wsProto = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${apiUrl.host}/ws/realtime?token=${encodeURIComponent(token)}`;
  }

  private handleClose(): void {
    this.isConnected.set(false);
    this.socket = null;
    if (this.manuallyClosed) return;

    for (const id of this.subscribedConversations) this.pendingSubscriptions.add(id);
    this.subscribedConversations.clear();

    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureSocket();
    }, delay);
  }

  private handleMessage(ev: MessageEvent): void {
    let data: ServerEvent;
    try {
      data = JSON.parse(ev.data as string) as ServerEvent;
    } catch {
      return;
    }
    const event = data.event;
    if (!event) return;

    if (event === 'subscribed' && typeof data.conversation_id === 'number') {
      this.subscribedConversations.add(data.conversation_id);
      this.pendingSubscriptions.delete(data.conversation_id);
      return;
    }
    if (event === 'unsubscribed' || event === 'error') return;

    const conversationId = data.conversation_id;
    const payload = data.payload ?? null;
    if (typeof conversationId !== 'number' || !payload) return;

    if (event === 'new_message') {
      const message = this.normalizeMessage(payload, conversationId);
      for (const handler of this.messageHandlers) handler(conversationId, message);
      return;
    }

    if (event === 'message_read') {
      const id = Number(payload['id']);
      if (!Number.isFinite(id)) return;
      const readAt = typeof payload['read_at'] === 'string' ? (payload['read_at'] as string) : null;
      for (const handler of this.readHandlers) handler(conversationId, id, true, readAt);
    }
  }

  private requestSubscribe(conversationId: number): void {
    if (this.subscribedConversations.has(conversationId)) return;
    this.pendingSubscriptions.add(conversationId);
    this.send({ action: 'subscribe', conversation_id: conversationId });
  }

  private flushPendingSubscriptions(): void {
    for (const id of this.pendingSubscriptions) {
      this.send({ action: 'subscribe', conversation_id: id });
    }
  }

  private send(message: { action: string; conversation_id: number }): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      /* empty */
    }
  }

  private normalizeMessage(raw: Record<string, unknown>, convId: number): MessageResponse {
    return {
      id: Number(raw['id']),
      conversation_id: Number(raw['conversation_id'] ?? convId),
      sender_id: Number(raw['sender_id']),
      content: String(raw['content'] ?? ''),
      sent_at: String(raw['sent_at'] ?? new Date().toISOString()),
      is_read: Boolean(raw['is_read'] ?? false),
      read_at: typeof raw['read_at'] === 'string' ? (raw['read_at'] as string) : null,
    };
  }
}

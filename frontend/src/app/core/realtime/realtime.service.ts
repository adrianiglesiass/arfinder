import { inject, Injectable, signal } from '@angular/core';

import { InsForgeClient } from '@insforge/sdk';

import type { MessageResponse } from '@core/api/api.models';

type MessageHandler = (conversationId: number, message: MessageResponse) => void;
type ReadHandler = (
  conversationId: number,
  messageId: number,
  isRead: boolean,
  readAt: string | null
) => void;

interface RealtimeMeta {
  channel?: string;
}

interface RealtimePayload {
  meta?: RealtimeMeta;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private readonly insforge = inject(InsForgeClient);

  private readonly subscribedChannels = new Set<string>();
  private readonly subscribePromises = new Map<string, Promise<void>>();
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly readHandlers = new Set<ReadHandler>();
  private listenersBound = false;

  isConnected = signal(false);

  addMessageHandler(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    this.bindListeners();
    return () => this.messageHandlers.delete(handler);
  }

  addReadHandler(handler: ReadHandler): () => void {
    this.readHandlers.add(handler);
    this.bindListeners();
    return () => this.readHandlers.delete(handler);
  }

  async subscribeConversations(conversationIds: number[]): Promise<void> {
    this.bindListeners();
    await this.ensureSocket();
    await Promise.all(conversationIds.map((id) => this.subscribeOne(id)));
  }

  async subscribeConversation(conversationId: number): Promise<void> {
    this.bindListeners();
    await this.ensureSocket();
    await this.subscribeOne(conversationId);
  }

  unsubscribeConversation(conversationId: number): void {
    const channel = this.channelFor(conversationId);
    if (!this.subscribedChannels.has(channel)) return;
    this.insforge.realtime.unsubscribe(channel);
    this.subscribedChannels.delete(channel);
    this.subscribePromises.delete(channel);
  }

  unsubscribeAll(): void {
    for (const channel of this.subscribedChannels) {
      this.insforge.realtime.unsubscribe(channel);
    }
    this.subscribedChannels.clear();
    this.subscribePromises.clear();
  }

  async publishMessage(conversationId: number, message: MessageResponse): Promise<void> {
    const channel = this.channelFor(conversationId);
    try {
      await this.ensureSubscribed(conversationId);
      if (!this.subscribedChannels.has(channel)) return;
      await this.insforge.realtime.publish(channel, 'new_message', {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        content: message.content,
        sent_at: message.sent_at,
        is_read: message.is_read,
        read_at: message.read_at,
      });
    } catch {
      /* empty */
    }
  }

  async publishRead(conversationId: number, messageIds: number[]): Promise<void> {
    if (!messageIds.length) return;
    const channel = this.channelFor(conversationId);
    try {
      await this.ensureSubscribed(conversationId);
      if (!this.subscribedChannels.has(channel)) return;
      const readAt = new Date().toISOString();
      for (const id of messageIds) {
        await this.insforge.realtime.publish(channel, 'message_read', { id, read_at: readAt });
      }
    } catch {
      /* empty */
    }
  }

  private async ensureSocket(): Promise<void> {
    if (this.insforge.realtime.isConnected) return;
    await this.insforge.realtime.connect();
  }

  private async ensureSubscribed(conversationId: number): Promise<void> {
    const channel = this.channelFor(conversationId);
    const inFlight = this.subscribePromises.get(channel);
    if (inFlight) {
      await inFlight;
      return;
    }
    if (!this.subscribedChannels.has(channel)) {
      await this.subscribeConversation(conversationId);
    }
  }

  private async subscribeOne(conversationId: number): Promise<void> {
    const channel = this.channelFor(conversationId);
    if (this.subscribedChannels.has(channel)) return;
    const existing = this.subscribePromises.get(channel);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const res = await this.insforge.realtime.subscribe(channel);
        if (!res?.ok) return;
        this.subscribedChannels.add(channel);
        this.isConnected.set(true);
      } finally {
        this.subscribePromises.delete(channel);
      }
    })();

    this.subscribePromises.set(channel, promise);
    return promise;
  }

  private bindListeners(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;

    this.insforge.realtime.on('connect', () => this.isConnected.set(true));
    this.insforge.realtime.on('disconnect', () => this.isConnected.set(false));

    this.insforge.realtime.on('new_message', (data: unknown) => {
      const convId = this.routeConvId(data);
      if (convId == null) return;
      const raw = this.extractPayload(data);
      if (!raw) return;
      const normalized = this.normalizeMessage(raw, convId);
      for (const handler of this.messageHandlers) handler(convId, normalized);
    });

    this.insforge.realtime.on('message_read', (data: unknown) => {
      const convId = this.routeConvId(data);
      if (convId == null) return;
      const raw = this.extractPayload(data);
      if (!raw) return;
      const id = Number(raw['id']);
      if (!Number.isFinite(id)) return;
      const readAt = typeof raw['read_at'] === 'string' ? (raw['read_at'] as string) : null;
      for (const handler of this.readHandlers) handler(convId, id, true, readAt);
    });
  }

  private routeConvId(data: unknown): number | null {
    const meta = (data as RealtimePayload | null)?.meta;
    if (!meta?.channel) return null;
    const channel = meta.channel.replace(/^realtime:/, '');
    if (!this.subscribedChannels.has(channel)) return null;
    const parts = channel.split(':');
    if (parts.length !== 2 || parts[0] !== 'conversation') return null;
    const id = Number(parts[1]);
    return Number.isFinite(id) ? id : null;
  }

  private extractPayload(data: unknown): Record<string, unknown> | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as RealtimePayload;
    if (obj.payload && typeof obj.payload === 'object') return obj.payload;
    const { meta: _meta, payload: _payload, ...rest } = obj;
    void _meta;
    void _payload;
    return rest as Record<string, unknown>;
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

  private channelFor(conversationId: number): string {
    return `conversation:${conversationId}`;
  }
}

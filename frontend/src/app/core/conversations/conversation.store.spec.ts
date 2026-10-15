import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';
import { vi } from 'vitest';

import type { ConversationResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockEvents } from '@core/block/block-events';
import { RealtimeService } from '@core/realtime/realtime.service';

import { ConversationStore } from './conversation.store';

describe('ConversationStore.refresh', () => {
  let list: ReturnType<typeof vi.fn>;
  let store: ConversationStore;

  beforeEach(() => {
    list = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ConversationApiService, useValue: { list } },
        {
          provide: RealtimeService,
          useValue: {
            connect: vi.fn(() => Promise.resolve()),
            subscribeConversations: vi.fn(() => Promise.resolve()),
            unsubscribeAll: vi.fn(),
            addMessageHandler: vi.fn(() => () => undefined),
            addConversationCreatedHandler: vi.fn(() => () => undefined),
          },
        },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1 }) } },
      ],
    });
    store = TestBed.inject(ConversationStore);
  });

  it('marca el error si falla la carga y lo limpia al reintentar con éxito', async () => {
    list.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce([]);

    await store.refresh();
    expect(store.error()).toBe(true);

    await store.refresh();
    expect(store.error()).toBe(false);
  });
});

describe('ConversationStore y bloqueos', () => {
  const conv = (id: number, profileId: number, canMessage = true): ConversationResponse => ({
    id,
    user1_id: 1,
    user2_id: id + 1,
    other_user: { user_id: id + 1, profile_id: profileId, name: `U${id}`, photo_url: null },
    last_message: null,
    unread_count: 0,
    can_message: canMessage,
  });

  let list: ReturnType<typeof vi.fn>;
  let store: ConversationStore;
  let events: BlockEvents;

  beforeEach(async () => {
    list = vi.fn().mockResolvedValue([conv(1, 10), conv(2, 20)]);
    TestBed.configureTestingModule({
      providers: [
        { provide: ConversationApiService, useValue: { list } },
        {
          provide: RealtimeService,
          useValue: {
            connect: vi.fn(() => Promise.resolve()),
            subscribeConversations: vi.fn(() => Promise.resolve()),
            unsubscribeAll: vi.fn(),
            addMessageHandler: vi.fn(() => () => undefined),
            addConversationCreatedHandler: vi.fn(() => () => undefined),
          },
        },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1 }) } },
      ],
    });
    store = TestBed.inject(ConversationStore);
    events = TestBed.inject(BlockEvents);
    TestBed.tick();
    await store.refresh();
  });

  it('al bloquear marca al instante la conversación con ese perfil y refresca del servidor', async () => {
    let finish!: (v: ConversationResponse[]) => void;
    list.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const callsBefore = list.mock.calls.length;

    events.emit({ profileId: 10, blocked: true });

    expect(store.conversations().map((c) => c.can_message)).toEqual([false, true]);
    finish([conv(1, 10, false), conv(2, 20)]);
    await vi.waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(store.conversations()[0].can_message).toBe(false);
  });

  it('al desbloquear toma can_message del servidor', async () => {
    list.mockResolvedValueOnce([conv(1, 10, false), conv(2, 20)]);
    await store.refresh();
    list.mockResolvedValueOnce([conv(1, 10, true), conv(2, 20)]);

    events.emit({ profileId: 10, blocked: false });

    await vi.waitFor(() => expect(store.conversations()[0].can_message).toBe(true));
  });

  it('markMessagingBlocked solo afecta a esa conversación', () => {
    store.markMessagingBlocked(2);

    expect(store.conversations().map((c) => c.can_message)).toEqual([true, false]);
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
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

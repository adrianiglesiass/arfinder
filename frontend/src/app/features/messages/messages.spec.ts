import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';
import { vi } from 'vitest';

import type { ConversationResponse, MessageResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { ConversationStore } from '@core/conversations/conversation.store';
import { RealtimeService } from '@core/realtime/realtime.service';

import Messages from './messages';

const PAGE_SIZE = 50;

function makeMessage(id: number, content = `m-${id}`): MessageResponse {
  return {
    id,
    conversation_id: 1,
    sender_id: 2,
    content,
    sent_at: new Date(2025, 0, 1, 0, 0, id).toISOString(),
    is_read: false,
    read_at: null,
  };
}

function makeConversation(): ConversationResponse {
  return {
    id: 1,
    user1_id: 1,
    user2_id: 2,
    other_user: { user_id: 2, name: 'Other', photo_url: null },
    last_message: null,
    unread_count: 0,
  };
}

describe('Messages — pagination', () => {
  let fixture: ComponentFixture<Messages>;
  let component: Messages;
  let getMessages: ReturnType<typeof vi.fn>;
  let markAsRead: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getMessages = vi.fn();
    markAsRead = vi.fn().mockResolvedValue(undefined);

    const conversations = signal<ConversationResponse[]>([makeConversation()]);
    const conversationStoreMock = {
      conversations,
      setActiveConversation: vi.fn(),
      refresh: vi.fn().mockResolvedValue(undefined),
      upsertConversationPreview: vi.fn(),
    };

    const realtimeMock = {
      addMessageHandler: vi.fn().mockReturnValue(() => undefined),
      addReadHandler: vi.fn().mockReturnValue(() => undefined),
      subscribeConversation: vi.fn().mockResolvedValue(undefined),
    };

    const authMock = {
      currentUser: signal<{ id: number } | null>({ id: 1 }),
    };

    await TestBed.configureTestingModule({
      imports: [Messages],
      providers: [
        provideRouter([]),
        {
          provide: ConversationApiService,
          useValue: {
            getMessages,
            markAsRead,
            sendMessage: vi.fn(),
            sendMessageToUser: vi.fn(),
            list: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
            get: vi.fn(),
          },
        },
        { provide: ConversationStore, useValue: conversationStoreMock },
        { provide: RealtimeService, useValue: realtimeMock },
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Messages);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('marks hasMoreMessages true when first page is full', async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => makeMessage(i + 1));
    getMessages.mockResolvedValueOnce(firstPage);

    await component.selectConversation(makeConversation());

    expect(getMessages).toHaveBeenCalledWith(1, { limit: PAGE_SIZE });
    expect(component.messages().length).toBe(PAGE_SIZE);
    expect(component.hasMoreMessages()).toBe(true);
  });

  it('marks hasMoreMessages false when first page is partial', async () => {
    const partial = Array.from({ length: 10 }, (_, i) => makeMessage(i + 1));
    getMessages.mockResolvedValueOnce(partial);

    await component.selectConversation(makeConversation());

    expect(component.hasMoreMessages()).toBe(false);
  });

  it('prepends older messages and clears hasMoreMessages on partial older page', async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => makeMessage(i + 51));
    const olderPage = Array.from({ length: 10 }, (_, i) => makeMessage(i + 41));
    getMessages.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(olderPage);

    await component.selectConversation(makeConversation());
    component.initialScrollDone.set(true);
    expect(component.messages()[0].id).toBe(51);
    expect(component.hasMoreMessages()).toBe(true);

    await component.loadOlderMessages();

    expect(getMessages).toHaveBeenLastCalledWith(1, { beforeId: 51, limit: PAGE_SIZE });
    expect(component.messages().length).toBe(PAGE_SIZE + 10);
    expect(component.messages()[0].id).toBe(41);
    expect(component.messages()[9].id).toBe(50);
    expect(component.hasMoreMessages()).toBe(false);
    expect(component.isLoadingOlder()).toBe(false);
  });

  it('keeps hasMoreMessages true when older page is full', async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => makeMessage(i + 51));
    const olderPage = Array.from({ length: PAGE_SIZE }, (_, i) => makeMessage(i + 1));
    getMessages.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(olderPage);

    await component.selectConversation(makeConversation());
    component.initialScrollDone.set(true);
    await component.loadOlderMessages();

    expect(component.messages().length).toBe(PAGE_SIZE * 2);
    expect(component.hasMoreMessages()).toBe(true);
  });

  it('skips loadOlder when no more messages', async () => {
    const partial = [makeMessage(1)];
    getMessages.mockResolvedValueOnce(partial);
    await component.selectConversation(makeConversation());
    component.initialScrollDone.set(true);

    getMessages.mockClear();
    await component.loadOlderMessages();
    expect(getMessages).not.toHaveBeenCalled();
  });

  it('skips loadOlder until the initial scroll has happened', async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => makeMessage(i + 51));
    getMessages.mockResolvedValueOnce(firstPage);
    await component.selectConversation(makeConversation());

    expect(component.initialScrollDone()).toBe(false);
    getMessages.mockClear();
    await component.loadOlderMessages();
    expect(getMessages).not.toHaveBeenCalled();
  });

  it('ignores optimistic (negative) ids when computing the cursor', async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => makeMessage(i + 51));
    const olderPage = [makeMessage(50)];
    getMessages.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(olderPage);

    await component.selectConversation(makeConversation());
    component.initialScrollDone.set(true);

    component.messages.update((msgs) => [makeMessage(-9999, 'optimistic'), ...msgs]);

    await component.loadOlderMessages();
    expect(getMessages).toHaveBeenLastCalledWith(1, { beforeId: 51, limit: PAGE_SIZE });
  });
});

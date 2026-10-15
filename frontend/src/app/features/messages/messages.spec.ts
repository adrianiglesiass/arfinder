import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ConversationApiService } from '@infrastructure/api/conversation/conversation.api.service';
import { vi } from 'vitest';

import type { ConversationResponse, MessageResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockService } from '@core/block/block.service';
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
    other_user: { user_id: 2, profile_id: 20, name: 'Other', photo_url: null },
    last_message: null,
    unread_count: 0,
    can_message: true,
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
      error: signal(false),
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
        { provide: BlockService, useValue: { blockedIds: signal<ReadonlySet<number>>(new Set()) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
            },
          },
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

describe('Messages — ciclo de vida y envíos', () => {
  const conv = (id: number): ConversationResponse => ({ ...makeConversation(), id });

  let storeRefresh: ReturnType<typeof vi.fn>;
  let addMessageHandler: ReturnType<typeof vi.fn>;
  let setActiveConversation: ReturnType<typeof vi.fn>;
  let sendMessage: ReturnType<typeof vi.fn>;
  let getMessages: ReturnType<typeof vi.fn>;
  let sendMessageToUser: ReturnType<typeof vi.fn>;
  let conversations: ReturnType<typeof signal<ConversationResponse[]>>;
  let blockedIds: ReturnType<typeof signal<ReadonlySet<number>>>;
  let markMessagingBlocked: ReturnType<typeof vi.fn>;

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [Messages],
      providers: [
        provideRouter([]),
        {
          provide: ConversationApiService,
          useValue: {
            getMessages,
            markAsRead: vi.fn().mockResolvedValue(undefined),
            sendMessage,
            sendMessageToUser,
            list: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
            get: vi.fn(),
          },
        },
        {
          provide: ConversationStore,
          useValue: {
            conversations,
            markMessagingBlocked,
            setActiveConversation,
            refresh: storeRefresh,
            upsertConversationPreview: vi.fn(),
            error: signal(false),
          },
        },
        {
          provide: RealtimeService,
          useValue: {
            addMessageHandler,
            addReadHandler: vi.fn().mockReturnValue(() => undefined),
            subscribeConversation: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1 }) } },
        { provide: BlockService, useValue: { blockedIds } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();
    return TestBed.createComponent(Messages);
  };

  beforeEach(() => {
    storeRefresh = vi.fn().mockResolvedValue(undefined);
    addMessageHandler = vi.fn().mockReturnValue(() => undefined);
    setActiveConversation = vi.fn();
    sendMessage = vi.fn();
    getMessages = vi.fn().mockResolvedValue([]);
    sendMessageToUser = vi.fn();
    conversations = signal<ConversationResponse[]>([conv(1), conv(2)]);
    blockedIds = signal<ReadonlySet<number>>(new Set());
    markMessagingBlocked = vi.fn((id: number) =>
      conversations.update((list) =>
        list.map((c) => (c.id === id ? { ...c, can_message: false } : c))
      )
    );
  });

  it('si se destruye durante la carga inicial, no registra handlers de realtime', async () => {
    let finishRefresh!: () => void;
    storeRefresh.mockReturnValue(new Promise<void>((resolve) => (finishRefresh = resolve)));
    const fixture = await setup();
    fixture.detectChanges();

    fixture.destroy();
    finishRefresh();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(addMessageHandler).not.toHaveBeenCalled();
  });

  it('un envío que termina tras cambiar de conversación no aparece en la nueva', async () => {
    let finishSend!: (m: MessageResponse) => void;
    sendMessage.mockReturnValue(new Promise<MessageResponse>((resolve) => (finishSend = resolve)));
    const fixture = await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    await component.selectConversation(conv(1));
    component.newMessage.set('hola desde la 1');
    const sending = component.sendMessage();
    await component.selectConversation(conv(2));
    finishSend({ ...makeMessage(900, 'hola desde la 1'), conversation_id: 1 });
    await sending;

    expect(component.messages().some((m) => m.id === 900)).toBe(false);
    expect(component.newMessage()).toBe('');
  });

  it('un envío fallido restaura el texto y muestra el aviso', async () => {
    sendMessage.mockRejectedValue(new Error('red'));
    const fixture = await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    await component.selectConversation(conv(1));
    component.newMessage.set('no llega');
    await component.sendMessage();

    expect(component.newMessage()).toBe('no llega');
    expect((component as unknown as { sendError: () => boolean }).sendError()).toBe(true);
  });

  it('un fallo al cargar la conversación muestra el error en vez de un chat vacío', async () => {
    const fixture = await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    getMessages.mockRejectedValueOnce(new Error('red'));

    await component.selectConversation(conv(1));

    expect((component as unknown as { chatError: () => boolean }).chatError()).toBe(true);
  });

  it('un envío desde un borrador no te devuelve a él si cambias de conversación mientras se crea', async () => {
    const fixture = await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    let finishRefresh!: () => void;
    storeRefresh.mockReturnValueOnce(new Promise<void>((resolve) => (finishRefresh = resolve)));
    sendMessageToUser.mockResolvedValue({ ...makeMessage(901, 'hola'), conversation_id: 77 });

    component.draftRecipient.set({ user_id: 5, name: 'Nueva', photo_url: null } as never);
    component.newMessage.set('hola');
    const sending = component.sendMessage();
    await vi.waitFor(() => expect(storeRefresh).toHaveBeenCalledTimes(2));
    await component.selectConversation(conv(2));
    finishRefresh();
    await sending;

    expect(component.selectedConversation()?.id).toBe(2);
    expect(setActiveConversation).not.toHaveBeenCalledWith(77);
  });

  it('el aviso de envío fallido desaparece al editar el texto', async () => {
    sendMessage.mockRejectedValue(new Error('red'));
    const fixture = await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const sendError = () => (component as unknown as { sendError: () => boolean }).sendError();

    await component.selectConversation(conv(1));
    component.newMessage.set('no llega');
    await component.sendMessage();
    expect(sendError()).toBe(true);

    component.newMessage.set('no llega, corregido');
    TestBed.tick();

    expect(sendError()).toBe(false);
  });

  describe('bloqueo', () => {
    const blockedError = () =>
      new HttpErrorResponse({
        status: 403,
        error: { code: 'MESSAGING_BLOCKED', detail: 'No puedes enviar mensajes a esta persona.' },
      });
    const notice = (fixture: ComponentFixture<Messages>) =>
      fixture.nativeElement.querySelector(
        '[data-testid="messaging-blocked"]'
      ) as HTMLElement | null;
    const composer = (fixture: ComponentFixture<Messages>) =>
      fixture.nativeElement.querySelector('app-message-composer');

    const open = async (conversation: ConversationResponse) => {
      const fixture = await setup();
      fixture.detectChanges();
      await fixture.whenStable();
      await fixture.componentInstance.selectConversation(conversation);
      fixture.detectChanges();
      return fixture;
    };

    it('una conversación sin can_message muestra el historial y un aviso en lugar del composer', async () => {
      const blocked = { ...conv(1), can_message: false };
      conversations.set([blocked, conv(2)]);
      getMessages.mockResolvedValueOnce([makeMessage(1, 'antes del bloqueo')]);

      const fixture = await open(blocked);

      expect(fixture.componentInstance.messages().map((m) => m.content)).toEqual([
        'antes del bloqueo',
      ]);
      expect(composer(fixture)).toBeNull();
      expect(notice(fixture)?.textContent).toContain(
        'No puedes enviar mensajes en esta conversación.'
      );
    });

    it('si lo bloqueé yo, el aviso lo dice y enlaza a su perfil', async () => {
      blockedIds.set(new Set([20]));

      const fixture = await open(conv(1));

      const text = notice(fixture)?.textContent ?? '';
      expect(text).toContain('Has bloqueado a Other');
      expect(notice(fixture)?.querySelector('a')?.getAttribute('href')).toBe('/perfil/20');
      expect(composer(fixture)).toBeNull();
    });

    it('al desbloquear vuelve el composer', async () => {
      blockedIds.set(new Set([20]));
      const fixture = await open(conv(1));
      expect(composer(fixture)).toBeNull();

      blockedIds.set(new Set());
      fixture.detectChanges();

      expect(composer(fixture)).not.toBeNull();
      expect(notice(fixture)).toBeNull();
    });

    it('un 403 MESSAGING_BLOCKED al enviar marca la conversación sin el error genérico', async () => {
      sendMessage.mockRejectedValue(blockedError());
      const fixture = await open(conv(1));
      const component = fixture.componentInstance;

      component.newMessage.set('¿sigues ahí?');
      await component.sendMessage();
      fixture.detectChanges();

      expect(markMessagingBlocked).toHaveBeenCalledWith(1);
      expect(component.messages()).toEqual([]);
      expect(component.newMessage()).toBe('');
      expect((component as unknown as { sendError: () => boolean }).sendError()).toBe(false);
      expect(component.messagingBlocked()).toBe(true);
      expect(notice(fixture)).not.toBeNull();
    });

    it('un 403 MESSAGING_BLOCKED desde un borrador bloquea el borrador', async () => {
      sendMessageToUser.mockRejectedValue(blockedError());
      const fixture = await setup();
      fixture.detectChanges();
      await fixture.whenStable();
      const component = fixture.componentInstance;

      component.draftRecipient.set({ user_id: 5, profile_id: 50, name: 'Nueva', photo_url: null });
      component.newMessage.set('hola');
      await component.sendMessage();
      fixture.detectChanges();

      expect(component.messagingBlocked()).toBe(true);
      expect(notice(fixture)).not.toBeNull();
      expect(storeRefresh).toHaveBeenCalledTimes(1);
    });

    it('no intenta enviar si la conversación está bloqueada', async () => {
      const blocked = { ...conv(1), can_message: false };
      conversations.set([blocked]);
      const fixture = await open(blocked);
      const component = fixture.componentInstance;

      component.newMessage.set('hola');
      await component.sendMessage();

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });
});

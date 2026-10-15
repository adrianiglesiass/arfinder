import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageComposer } from './message-composer';

describe('MessageComposer', () => {
  let fixture: ComponentFixture<MessageComposer>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageComposer);
    fixture.detectChanges();
  });

  it('gives the icon-only send button an accessible name', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.getAttribute('aria-label')).toBe('Enviar mensaje');
  });

  it('labels the message field', () => {
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(textarea.getAttribute('aria-label')).toBe('Escribe un mensaje');
  });
});

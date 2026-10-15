import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDialog } from './modal-dialog';

@Component({
  imports: [ModalDialog],
  template: `
    <button id="opener" type="button">Abrir</button>
    @if (open()) {
      <div appModalDialog role="dialog" (escaped)="escapes = escapes + 1">
        <button id="first" type="button">Primero</button>
        <button type="button" disabled>Desactivado</button>
        <button id="last" type="button">Último</button>
      </div>
    }
  `,
})
class Host {
  readonly open = signal(false);
  escapes = 0;
}

@Component({
  imports: [ModalDialog],
  template: `
    <div appModalDialog (escaped)="outer = outer + 1"><button type="button">Fuera</button></div>
    @if (inner()) {
      <div appModalDialog (escaped)="innerEscapes = innerEscapes + 1">
        <button type="button">Dentro</button>
      </div>
    }
  `,
})
class StackedHost {
  readonly inner = signal(true);
  outer = 0;
  innerEscapes = 0;
}

const press = (key: string, shiftKey = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  document.activeElement?.dispatchEvent(event);
  return event;
};

describe('ModalDialog', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  const byId = (id: string) => document.getElementById(id) as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    host = fixture.componentInstance;
    fixture.detectChanges();
    byId('opener').focus();
    host.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.nativeElement.remove());

  it('moves focus to the first focusable element when opened', () => {
    expect(document.activeElement).toBe(byId('first'));
  });

  it('emits escaped on Escape', () => {
    const event = press('Escape');
    expect(host.escapes).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('wraps Tab from the last element to the first, skipping disabled ones', () => {
    byId('last').focus();
    const event = press('Tab');
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('first'));
  });

  it('wraps Shift+Tab from the first element to the last', () => {
    const event = press('Tab', true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('last'));
  });

  it('lets Tab move normally between inner elements', () => {
    const event = press('Tab');
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores Escape already handled by an inner widget', () => {
    byId('first').addEventListener('keydown', (e) => e.preventDefault(), { once: true });
    press('Escape');
    expect(host.escapes).toBe(0);
  });

  it('pulls focus back inside when it escaped the panel', () => {
    byId('opener').focus();
    press('Tab');
    expect(document.activeElement).toBe(byId('first'));
  });

  it('returns focus to the opener when closed', () => {
    host.open.set(false);
    fixture.detectChanges();
    expect(document.activeElement).toBe(byId('opener'));
  });
});

describe('ModalDialog stacked', () => {
  it('only lets the topmost dialog react to Escape', async () => {
    const fixture = TestBed.createComponent(StackedHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();

    press('Escape');
    expect(fixture.componentInstance.innerEscapes).toBe(1);
    expect(fixture.componentInstance.outer).toBe(0);

    fixture.componentInstance.inner.set(false);
    fixture.detectChanges();
    press('Escape');
    expect(fixture.componentInstance.outer).toBe(1);
    fixture.destroy();
    fixture.nativeElement.remove();
  });
});

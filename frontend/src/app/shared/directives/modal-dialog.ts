import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keyboard behaviour for a modal panel (`role="dialog"`): moves focus inside on open, traps Tab,
 * emits `escaped` on Escape and gives focus back to the opener when destroyed.
 */
@Directive({
  selector: '[appModalDialog]',
  host: {
    tabindex: '-1',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class ModalDialog {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly opener =
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

  readonly escaped = output<void>();

  constructor() {
    afterNextRender(() => (this.focusables()[0] ?? this.host).focus());
    inject(DestroyRef).onDestroy(() => {
      if (this.opener?.isConnected) this.opener.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.escaped.emit();
      return;
    }
    if (event.key === 'Tab') this.trapTab(event);
  }

  private trapTab(event: KeyboardEvent): void {
    const items = this.focusables();
    if (items.length === 0) {
      event.preventDefault();
      this.host.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = active !== null && this.host.contains(active);

    if (event.shiftKey && (!inside || active === first || active === this.host)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.closest('[inert]')
    );
  }
}

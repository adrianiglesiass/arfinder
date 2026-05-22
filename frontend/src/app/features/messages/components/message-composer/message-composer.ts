import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-message-composer',
  templateUrl: './message-composer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);

  readonly send = output<void>();

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly canSend = computed(() => !this.disabled() && this.value().trim().length > 0);

  protected readonly submitClass = computed(() =>
    this.canSend()
      ? 'bg-chat-sent hover:bg-chat-sent-hover active:bg-chat-sent-active active:scale-95 cursor-pointer'
      : 'bg-gray-300 cursor-not-allowed'
  );

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.send.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send.emit();
    }
  }

  resetHeight(): void {
    const ta = this.textarea()?.nativeElement;
    if (ta) ta.style.height = 'auto';
  }

  focus(): void {
    this.textarea()?.nativeElement.focus();
  }
}

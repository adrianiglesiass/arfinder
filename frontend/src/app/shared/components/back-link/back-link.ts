import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type BackLinkVariant = 'eyebrow' | 'link';

@Component({
  selector: 'app-back-link',
  imports: [RouterLink],
  templateUrl: './back-link.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
})
export class BackLink {
  readonly link = input.required<string | unknown[]>();
  readonly label = input.required<string>();
  readonly variant = input<BackLinkVariant>('eyebrow');

  protected readonly anchorClass = computed(() =>
    this.variant() === 'link'
      ? 'inline-flex items-center gap-2 text-primary font-semibold hover:underline'
      : 'inline-flex items-center gap-2 text-gray-500 hover:text-primary active:text-primary transition-colors'
  );
  protected readonly iconClass = computed(() =>
    this.variant() === 'link' ? 'pi pi-arrow-left text-sm' : 'pi pi-arrow-left text-xs'
  );
  protected readonly labelClass = computed(() =>
    this.variant() === 'link' ? '' : 'text-[11px] font-bold uppercase tracking-[0.16em]'
  );
}

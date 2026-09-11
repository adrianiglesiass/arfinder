import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { BlockService } from '@core/block/block.service';

const DESTRUCTIVE_LINK = 'group text-red-500 hover:bg-red-600 hover:text-white';
const DESTRUCTIVE_ICON = 'text-red-500 group-hover:text-white';

@Component({
  selector: 'app-profile-actions-menu',
  imports: [MenuModule],
  templateUrl: './profile-actions-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex',
  },
})
export class ProfileActionsMenu {
  private readonly blocks = inject(BlockService);

  readonly profileId = input.required<number>();

  readonly blockRequested = output<void>();
  readonly unblockRequested = output<void>();
  readonly reportRequested = output<void>();

  protected readonly expanded = signal(false);

  protected readonly isBlocked = computed(() => this.blocks.blockedIds().has(this.profileId()));

  protected readonly items = computed<MenuItem[]>(() => [
    this.isBlocked()
      ? {
          label: 'Desbloquear',
          icon: 'pi pi-lock-open',
          command: () => this.unblockRequested.emit(),
        }
      : {
          label: 'Bloquear',
          icon: 'pi pi-ban',
          linkClass: DESTRUCTIVE_LINK,
          iconClass: DESTRUCTIVE_ICON,
          command: () => this.blockRequested.emit(),
        },
    {
      label: 'Reportar',
      icon: 'pi pi-flag',
      linkClass: DESTRUCTIVE_LINK,
      iconClass: DESTRUCTIVE_ICON,
      command: () => this.reportRequested.emit(),
    },
  ]);
}

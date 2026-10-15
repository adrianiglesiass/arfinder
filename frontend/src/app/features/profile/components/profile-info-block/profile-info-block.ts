import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { ProfileResponse } from '@core/api/api.models';

import { Button } from '@shared/components/button/button';

import { SCHEDULE_LABELS, TYPE_LABELS } from '@features/profile/profile-labels';

@Component({
  selector: 'app-profile-info-block',
  imports: [Button],
  templateUrl: './profile-info-block.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfoBlock {
  readonly profile = input.required<ProfileResponse>();
  readonly showSendMessageButton = input<boolean>(false);
  readonly canSendMessage = input<boolean>(true);
  readonly sendingMessage = input<boolean>(false);

  readonly sendMessage = output<void>();

  protected readonly scheduleLabel = computed(() => {
    const schedule = this.profile().schedule;
    return schedule ? SCHEDULE_LABELS[schedule] : null;
  });

  protected readonly typeLabel = computed(() => TYPE_LABELS[this.profile().type]);

  protected readonly isRoommate = computed(() => this.profile().type === 'looking_for_roommate');

  /** `max_budget` is a room's price for room offerers and a seeker's budget otherwise. */
  protected readonly budgetText = computed(() =>
    this.isRoommate()
      ? { label: 'Precio de la habitación', unset: 'Sin indicar', unsetIcon: null }
      : { label: 'Presupuesto máximo', unset: 'Sin límite', unsetIcon: 'all_inclusive' }
  );

  protected readonly formattedAvailableFrom = computed(() => {
    const date = this.profile().available_from;
    if (!date) return null;
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  onSendMessage(): void {
    this.sendMessage.emit();
  }
}

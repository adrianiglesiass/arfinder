import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '@shared/components/button/button';

@Component({
  selector: 'app-confirm-destructive-dialog',
  imports: [Button],
  templateUrl: './confirm-destructive-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDestructiveDialog {
  readonly isDeleting = input(false);
  readonly title = input<string>('¿Eliminar tu cuenta?');
  readonly description = input<string>(
    'Tu perfil dejará de aparecer en las búsquedas y se borrarán tus fotos, conversaciones y mensajes. Esta acción no se puede deshacer.'
  );
  readonly confirmLabel = input<string>('Eliminar cuenta');

  readonly dismissed = output<void>();
  readonly confirmed = output<void>();

  onCancel(): void {
    if (this.isDeleting()) return;
    this.dismissed.emit();
  }

  onConfirm(): void {
    if (this.isDeleting()) return;
    this.confirmed.emit();
  }
}

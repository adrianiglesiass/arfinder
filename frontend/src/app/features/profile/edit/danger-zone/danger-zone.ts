import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MessageService } from 'primeng/api';

import { AuthService } from '@core/auth/auth.service';
import { ROUTES } from '@core/constants/routes';
import { ErrorService } from '@core/errors';

import { Button } from '@shared/components/button/button';
import { ConfirmDestructiveDialog } from '@shared/components/confirm-destructive-dialog/confirm-destructive-dialog';

@Component({
  selector: 'app-danger-zone',
  imports: [Button, ConfirmDestructiveDialog],
  templateUrl: './danger-zone.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DangerZone {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly errorService = inject(ErrorService);

  readonly showConfirm = signal(false);
  readonly isDeleting = signal(false);

  open(): void {
    if (this.isDeleting()) return;
    this.showConfirm.set(true);
  }

  cancel(): void {
    if (this.isDeleting()) return;
    this.showConfirm.set(false);
  }

  async confirm(): Promise<void> {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);
    try {
      await this.authService.deleteAccount();
      this.showConfirm.set(false);
      await this.router.navigate([ROUTES.LOGIN]);
    } catch (err) {
      const { general } = this.errorService.processError(err as HttpErrorResponse);
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo eliminar la cuenta',
        detail: general || 'Inténtalo de nuevo en unos minutos.',
        life: 5000,
      });
    } finally {
      this.isDeleting.set(false);
    }
  }
}

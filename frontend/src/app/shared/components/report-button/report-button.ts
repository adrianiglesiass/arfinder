import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { ReportApiService } from '@infrastructure/api/report/report.api.service';
import { MessageService } from 'primeng/api';

import type { ReportCreate } from '@core/api/api.models';
import { BlockService } from '@core/block/block.service';
import { ErrorService } from '@core/errors';

import { ReportDialog } from '@shared/components/report-dialog/report-dialog';

@Component({
  selector: 'app-report-button',
  imports: [ReportDialog],
  templateUrl: './report-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class ReportButton {
  private readonly api = inject(ReportApiService);
  private readonly blocks = inject(BlockService);
  private readonly messageService = inject(MessageService);
  private readonly errorService = inject(ErrorService);

  readonly profileId = input.required<number>();
  readonly compact = input(false);

  protected readonly showDialog = signal(false);
  protected readonly isSubmitting = signal(false);

  protected readonly sizeClasses = computed(() =>
    this.compact() ? 'w-10 h-10 shrink-0' : 'w-full px-4 py-2.5'
  );

  protected open(event: Event): void {
    event.stopPropagation();
    this.showDialog.set(true);
  }

  protected close(): void {
    if (this.isSubmitting()) return;
    this.showDialog.set(false);
  }

  protected async submit(payload: ReportCreate): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      await this.api.report(this.profileId(), payload);
      await this.blocks.refresh();
      this.showDialog.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Reporte enviado',
        detail: 'Gracias por avisarnos. También hemos bloqueado a esta persona.',
        life: 5000,
      });
    } catch (err) {
      const { general } = this.errorService.processError(err as HttpErrorResponse);
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo enviar el reporte',
        detail: general,
        life: 5000,
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

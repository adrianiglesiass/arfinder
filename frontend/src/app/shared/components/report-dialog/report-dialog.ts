import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type { ReportCreate, ReportReasonEnum } from '@core/api/api.models';

import { Button } from '@shared/components/button/button';

import { REPORT_REASONS } from './report-reasons';

@Component({
  selector: 'app-report-dialog',
  imports: [Button],
  templateUrl: './report-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDialog {
  readonly isSubmitting = input(false);

  readonly dismissed = output<void>();
  readonly submitted = output<ReportCreate>();

  protected readonly reasons = REPORT_REASONS;
  protected readonly selectedReason = signal<ReportReasonEnum | null>(null);
  protected readonly detail = signal('');

  protected readonly canSubmit = computed(
    () => this.selectedReason() !== null && !this.isSubmitting()
  );

  protected selectReason(reason: ReportReasonEnum): void {
    if (this.isSubmitting()) return;
    this.selectedReason.set(reason);
  }

  protected onDetailInput(event: Event): void {
    this.detail.set((event.target as HTMLTextAreaElement).value);
  }

  protected onCancel(): void {
    if (this.isSubmitting()) return;
    this.dismissed.emit();
  }

  protected onConfirm(): void {
    const reason = this.selectedReason();
    if (reason === null || this.isSubmitting()) return;

    const trimmed = this.detail().trim();
    this.submitted.emit({ reason, detail: trimmed.length > 0 ? trimmed : null });
  }
}

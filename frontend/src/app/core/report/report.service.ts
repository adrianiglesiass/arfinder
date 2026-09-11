import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ReportApiService } from '@infrastructure/api/report/report.api.service';

import type { ReportCreate } from '@core/api/api.models';
import { BlockService } from '@core/block/block.service';
import { ErrorService } from '@core/errors';

export type ReportResult = { ok: true } | { ok: false; message: string };

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly api = inject(ReportApiService);
  private readonly blocks = inject(BlockService);
  private readonly errors = inject(ErrorService);

  async report(profileId: number, payload: ReportCreate): Promise<ReportResult> {
    try {
      await this.api.report(profileId, payload);
    } catch (err) {
      return { ok: false, message: this.errors.getErrorMessage(err as HttpErrorResponse) };
    }
    await this.blocks.refresh();
    return { ok: true };
  }
}

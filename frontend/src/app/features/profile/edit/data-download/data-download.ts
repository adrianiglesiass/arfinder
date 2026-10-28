import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { MessageService } from 'primeng/api';

import { AuthService } from '@core/auth/auth.service';
import { ErrorService } from '@core/errors';

import { Button } from '@shared/components/button/button';

export const DATA_EXPORT_FILENAME = 'arfinder-datos.json';
const REVOKE_DELAY_MS = 1000;

@Component({
  selector: 'app-data-download',
  imports: [Button],
  templateUrl: './data-download.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataDownload {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly errorService = inject(ErrorService);
  private readonly document = inject(DOCUMENT);

  readonly isDownloading = signal(false);

  async download(): Promise<void> {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);
    try {
      const blob = await this.authService.exportMyData();
      if (blob.size === 0) {
        throw new Error('empty export payload');
      }
      this.saveBlob(blob);
      this.messageService.add({
        severity: 'success',
        summary: 'Descarga iniciada',
        detail: `Tu archivo ${DATA_EXPORT_FILENAME} se está descargando.`,
        life: 5000,
      });
    } catch (err) {
      const { general } = this.errorService.processError(err as HttpErrorResponse);
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudieron descargar tus datos',
        detail: general || 'Inténtalo de nuevo en unos minutos.',
        life: 5000,
      });
    } finally {
      this.isDownloading.set(false);
    }
  }

  private saveBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = DATA_EXPORT_FILENAME;
    link.rel = 'noopener';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    // Some browsers start the download asynchronously; release the URL afterwards.
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}

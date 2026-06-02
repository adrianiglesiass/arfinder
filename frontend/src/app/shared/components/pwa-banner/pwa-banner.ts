import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { filter } from 'rxjs';

import { STORAGE_KEYS } from '@core/constants/storage-keys';

import { Button } from '@shared/components/button/button';

@Component({
  selector: 'app-pwa-banner',
  imports: [Button],
  templateUrl: './pwa-banner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class PwaBanner {
  private readonly swUpdate = inject(SwUpdate);

  protected readonly showUpdate = signal(false);
  protected readonly showInstall = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((event) => event.type === 'VERSION_READY'))
        .subscribe(() => this.showUpdate.set(true));
    }
    this.showInstall.set(this.shouldShowInstallHint());
  }

  protected onVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.swUpdate.isEnabled) {
      void this.swUpdate.checkForUpdate();
    }
  }

  protected dismissInstall(): void {
    this.showInstall.set(false);
    try {
      localStorage.setItem(STORAGE_KEYS.pwa.iosHintDismissed, '1');
    } catch (error) {
      console.error('Error saving pwa hint state:', error);
    }
  }

  protected dismissUpdate(): void {
    this.showUpdate.set(false);
  }

  protected async reload(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } catch (error) {
      console.error('Error activating update:', error);
    }
    document.location.reload();
  }

  private shouldShowInstallHint(): boolean {
    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isIOS || !isSafari || isStandalone) return false;

    try {
      return localStorage.getItem(STORAGE_KEYS.pwa.iosHintDismissed) !== '1';
    } catch (error) {
      console.error('Error reading pwa hint state:', error);
      return true;
    }
  }
}

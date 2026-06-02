import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';

import { PwaBanner } from '@shared/components/pwa-banner/pwa-banner';
import { Spinner } from '@shared/components/spinner/spinner';

const SPINNER_DELAY_MS = 200;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Spinner, PwaBanner],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly navigating = signal(false);
  private spinnerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const router = inject(Router);
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.spinnerTimer) clearTimeout(this.spinnerTimer);
        this.spinnerTimer = setTimeout(() => {
          this.navigating.set(true);
          this.spinnerTimer = null;
        }, SPINNER_DELAY_MS);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.spinnerTimer) {
          clearTimeout(this.spinnerTimer);
          this.spinnerTimer = null;
        }
        this.navigating.set(false);
      }
    });
  }
}

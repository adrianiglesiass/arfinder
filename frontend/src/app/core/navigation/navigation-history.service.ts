import { effect, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { isAuthPath } from '@core/constants/routes';

/**
 * Keeps in memory the last visited URL outside the auth area, as long as this browser tab lives.
 *
 * The full URL is stored, query string and fragment included, so going back restores filters and
 * anchors. A reload counts as a cold start: nothing is recorded and callers fall back to the public
 * landing, which is the intended behaviour on a freshly opened PWA.
 *
 * The history is dropped as soon as the session is lost, so going back never points at a private
 * screen the user can no longer open.
 *
 * `app.config.ts` instantiates it at startup; without that it would only start recording once an
 * auth screen mounts and it would miss the previous page.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly lastUrl = signal<string | null>(null);
  private hasSeenSession = false;

  readonly previousUrl = this.lastUrl.asReadonly();

  constructor() {
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      this.record(event.urlAfterRedirects);
    });

    effect(() => {
      const user = this.auth.currentUser();
      // `currentUser` is null until the session bootstrap resolves, so only a real drop counts.
      if (user === null && this.hasSeenSession) this.lastUrl.set(null);

      this.hasSeenSession = user !== null;
    });
  }

  /** Forgets the history, so the next back fallback leads to the public entry instead. */
  reset(): void {
    this.lastUrl.set(null);
  }

  private record(url: string): void {
    if (!url || isAuthPath(url) || this.lastUrl() === url) return;

    this.lastUrl.set(url);
  }
}

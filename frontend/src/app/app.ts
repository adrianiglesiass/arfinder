import { Component, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';

import { Spinner } from '@shared/components/spinner/spinner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Spinner],
  templateUrl: './app.html',
})
export class App {
  protected readonly navigating = signal(false);

  constructor() {
    const router = inject(Router);
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigating.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.navigating.set(false);
      }
    });
  }
}

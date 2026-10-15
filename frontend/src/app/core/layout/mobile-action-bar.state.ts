import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MobileActionBarState {
  private readonly mounted = signal(0);

  readonly isVisible = computed(() => this.mounted() > 0);

  register(): void {
    this.mounted.update((count) => count + 1);
  }

  unregister(): void {
    this.mounted.update((count) => Math.max(0, count - 1));
  }
}

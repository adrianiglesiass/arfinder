import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RightPanelService {
  readonly template = signal<TemplateRef<unknown> | null>(null);

  set(template: TemplateRef<unknown>): void {
    this.template.set(template);
  }

  clear(): void {
    this.template.set(null);
  }
}

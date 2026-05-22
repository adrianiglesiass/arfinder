import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-edit-section',
  templateUrl: './edit-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditSection {
  readonly sectionId = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string>('');

  protected readonly htmlId = computed(() => `section-${this.sectionId()}`);
  protected readonly titleId = computed(() => `${this.sectionId()}-title`);
}

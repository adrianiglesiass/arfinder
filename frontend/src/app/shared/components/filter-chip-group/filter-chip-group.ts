import { Component, input, output } from '@angular/core';

import { uniqueId } from '@shared/utils/unique-id';

export interface FilterChipOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-filter-chip-group',
  imports: [],
  templateUrl: './filter-chip-group.html',
})
export class FilterChipGroup<T> {
  label = input<string>('');
  options = input.required<FilterChipOption<T>[]>();
  value = input<T | null>(null);
  allowDeselect = input<boolean>(true);

  changed = output<T | null>();

  protected readonly labelId = uniqueId('chip-group-label');

  isSelected(option: FilterChipOption<T>): boolean {
    return this.value() === option.value;
  }

  select(option: FilterChipOption<T>): void {
    if (this.isSelected(option)) {
      if (this.allowDeselect()) this.changed.emit(null);
      return;
    }
    this.changed.emit(option.value);
  }
}

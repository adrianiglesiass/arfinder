import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { ProfileCreate, ScheduleEnum } from '@core/api/api.models';

@Component({
  selector: 'app-step-lifestyle',
  imports: [FormsModule, ToggleSwitchModule],
  templateUrl: './step-lifestyle.html',
})
export class StepLifestyle {
  schedule = input.required<ScheduleEnum>();
  hasPets = input.required<boolean>();
  isSmoker = input.required<boolean>();

  dataChange = output<Partial<ProfileCreate>>();

  readonly schedules: { label: string; value: ScheduleEnum }[] = [
    { label: 'Mañana', value: 'morning' },
    { label: 'Tarde', value: 'afternoon' },
    { label: 'Noche', value: 'night' },
    { label: 'Flexible', value: 'flexible' },
  ];

  setSchedule(val: ScheduleEnum) {
    this.dataChange.emit({ schedule: val });
  }
  updateToggle(field: keyof ProfileCreate, val: boolean) {
    this.dataChange.emit({ [field]: val });
  }

  getScheduleClass(val: ScheduleEnum) {
    return this.schedule() === val
      ? 'bg-primary text-white border-primary'
      : 'bg-white text-gray-700 border-gray-200 hover:border-primary';
  }
}

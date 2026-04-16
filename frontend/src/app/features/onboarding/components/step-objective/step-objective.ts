import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SliderModule } from 'primeng/slider';

import { ProfileCreate, TypeEnum } from '@core/api/api.models';

@Component({
  selector: 'app-step-objective',
  imports: [FormsModule, SliderModule],
  templateUrl: './step-objective.html',
})
export class StepObjective {
  type = input.required<TypeEnum>();
  budget = input<number>(700);

  dataChange = output<Partial<ProfileCreate>>();

  setType(val: TypeEnum) {
    this.dataChange.emit({ type: val });
  }

  onBudgetChange(val: number) {
    this.dataChange.emit({ max_budget: val });
  }

  cardClasses(selected: boolean) {
    return selected
      ? 'border-accent bg-accent/5 ring-1 ring-accent'
      : 'border-gray-100 hover:border-accent/30 bg-white';
  }
}

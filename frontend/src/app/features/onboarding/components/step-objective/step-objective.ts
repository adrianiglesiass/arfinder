import { Component, computed, input, output } from '@angular/core';
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

  isLookingForFlat = computed(() => this.type() === 'looking_for_flat');
  isLookingForRoommate = computed(() => this.type() === 'looking_for_roommate');

  budgetLabel = computed(() =>
    this.isLookingForFlat() ? 'Presupuesto máximo' : 'Precio de la habitación'
  );

  flatIconClass = computed(() =>
    this.isLookingForFlat() ? 'bg-accent text-white' : 'bg-gray-50 text-primary'
  );

  roommateIconClass = computed(() =>
    this.isLookingForRoommate() ? 'bg-accent text-white' : 'bg-gray-50 text-primary'
  );

  flatCardClass = computed(() => this.cardClasses(this.isLookingForFlat()));
  roommateCardClass = computed(() => this.cardClasses(this.isLookingForRoommate()));

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

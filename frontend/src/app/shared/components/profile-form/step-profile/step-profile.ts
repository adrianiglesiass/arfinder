import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { ProfileCreate } from '@core/api/api.models';

import { CityAutocomplete } from '@shared/components/city-autocomplete/city-autocomplete';

@Component({
  selector: 'app-step-profile',
  imports: [FormsModule, InputTextModule, TextareaModule, AutoCompleteModule, CityAutocomplete],
  templateUrl: './step-profile.html',
})
export class StepProfile {
  name = input.required<string>();
  age = input.required<number>();
  city = input<string>('');
  bio = input<string>('');
  gender = input<string>('');
  availableFrom = input<string>('');
  showErrors = input<boolean>(false);

  changed = output<Partial<ProfileCreate>>();

  onModelChange(field: keyof ProfileCreate, value: ProfileCreate[keyof ProfileCreate]): void {
    this.changed.emit({ [field]: value });
  }

  onCitySelect(selectedCity: string) {
    this.changed.emit({ city: selectedCity });
  }
}

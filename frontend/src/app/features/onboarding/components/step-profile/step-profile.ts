import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { ProfileCreate } from '@core/api/api.models';

import { Search } from '@features/search/search';

@Component({
  selector: 'app-step-profile',
  imports: [FormsModule, InputTextModule, TextareaModule, AutoCompleteModule, Search],
  templateUrl: './step-profile.html',
})
export class StepProfile {
  name = input<string>('');
  age = input<number | undefined>();
  bio = input<string>('');
  city = input<string>('');

  changed = output<Partial<ProfileCreate>>();

  onModelChange(field: keyof ProfileCreate, value: ProfileCreate[keyof ProfileCreate]): void {
    this.changed.emit({ [field]: value });
  }

  onCitySelect(selectedCity: string) {
    this.changed.emit({ city: selectedCity });
  }
}

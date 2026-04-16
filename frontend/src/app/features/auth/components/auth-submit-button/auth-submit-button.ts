import { Component, input } from '@angular/core';

import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-auth-submit-button',
  imports: [ButtonModule],
  templateUrl: './auth-submit-button.html',
})
export class AuthSubmitButton {
  loading = input(false);
  label = input('Continuar');
  buttonClass = input(
    'w-full py-3.5 rounded-2xl! font-medium text-sm mt-1 active:scale-95 transition-all'
  );
}

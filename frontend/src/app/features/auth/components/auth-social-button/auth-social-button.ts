import { Component, input, output } from '@angular/core';

import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-auth-social-button',
  imports: [ButtonModule],
  templateUrl: './auth-social-button.html',
})
export class AuthSocialButton {
  loading = input(false);
  label = input('Continúa con Google');
  action = output<void>();
}

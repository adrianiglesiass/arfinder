import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';

@Component({
  selector: 'app-auth-card',
  imports: [ArfinderLogo, RouterLink],
  templateUrl: './auth-card.html',
})
export class AuthCard {
  activeTab = input.required<'login' | 'register'>();
}

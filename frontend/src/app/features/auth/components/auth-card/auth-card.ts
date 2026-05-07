import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';

@Component({
  selector: 'app-auth-card',
  imports: [ArfinderLogo, RouterLink],
  templateUrl: './auth-card.html',
})
export class AuthCard {
  activeTab = input.required<'login' | 'register' | 'verify'>();

  isLoginActive = computed(() => this.activeTab() === 'login');
  isRegisterActive = computed(() => this.activeTab() === 'register');
  showTabs = computed(() => this.activeTab() !== 'verify');

  loginTabClass = computed(() =>
    this.isLoginActive() ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-primary'
  );

  registerTabClass = computed(() =>
    this.isRegisterActive() ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-primary'
  );
}

import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { isAuthPath, ROUTES } from '@core/constants/routes';
import { NavigationHistoryService } from '@core/navigation/navigation-history.service';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';
import { IconButton } from '@shared/components/icon-button/icon-button';
import { PageBackground } from '@shared/components/page-background/page-background';

@Component({
  selector: 'app-auth-card',
  imports: [ArfinderLogo, IconButton, PageBackground, RouterLink],
  templateUrl: './auth-card.html',
})
export class AuthCard {
  private readonly router = inject(Router);
  private readonly navigationHistory = inject(NavigationHistoryService);

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

  protected onBack(): void {
    const target =
      this.activeTab() === 'verify'
        ? ROUTES.REGISTER
        : (this.navigationHistory.previousUrl() ?? ROUTES.ROOT);

    void this.router.navigateByUrl(target).then(
      (navigated) => {
        // A guard that redirects resolves to false too, so only a mute attempt needs the fallback.
        if (!navigated && isAuthPath(this.router.url)) void this.router.navigateByUrl(ROUTES.ROOT);
      },
      () => void this.router.navigateByUrl(ROUTES.ROOT)
    );
  }
}

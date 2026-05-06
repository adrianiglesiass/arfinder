import { Component, inject, OnInit } from '@angular/core';

import { AuthService } from '@core/auth/auth.service';

import { Spinner } from '@shared/components/spinner/spinner';

@Component({
  selector: 'app-auth-callback',
  imports: [Spinner],
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <app-spinner size="xl" />
    </div>
  `,
})
export default class AuthCallback implements OnInit {
  private readonly authService = inject(AuthService);

  async ngOnInit() {
    await this.authService.init();

    if (window.location.pathname.includes('/auth/callback')) {
      await this.authService.navigatePostAuth();
    }
  }
}

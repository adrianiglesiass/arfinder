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
    const params = new URLSearchParams(window.location.search);
    const code = params.get('insforge_code');

    if (code) {
      window.history.replaceState({}, '', '/auth/callback');
      try {
        await this.authService.handleOAuthCallback(code);
      } catch {
        await this.authService.init();
      }
    } else {
      await this.authService.init();
    }

    if (window.location.pathname.includes('/auth/callback')) {
      try {
        await this.authService.navigatePostAuth();
      } catch {
        /* invalidateSession already routes to /login on auth failure */
      }
    }
  }
}

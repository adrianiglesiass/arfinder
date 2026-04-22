import { Component, inject, OnInit } from '@angular/core';

import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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

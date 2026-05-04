import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { AuthService } from '@core/auth/auth.service';
import { ProfileService } from '@core/profile/profile.service';

@Component({
  selector: 'app-navbar-user-menu',
  templateUrl: './navbar-user-menu.html',
  imports: [MenuModule],
})
export class NavbarUserMenu {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly avatarUrl = this.profileService.profilePhotoUrl;

  items: MenuItem[] = [
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      command: async () => {
        await this.router.navigate(['/profile']);
      },
    },
    {
      separator: true,
    },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out ',
      linkClass: 'group text-red-500 hover:bg-red-600 hover:text-white',
      iconClass: 'text-red-500 group-hover:text-white',
      command: async () => {
        await this.handleLogout();
      },
    },
  ];

  async handleLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}

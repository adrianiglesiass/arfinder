import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { AuthService } from '@core/auth/auth.service';
import { ProfileService } from '@core/profile/profile.service';

@Component({
  selector: 'app-sidebar-user-item',
  imports: [MenuModule],
  templateUrl: './sidebar-user-item.html',
})
export class SidebarUserItem {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly avatarUrl = this.profileService.profilePhotoUrl;

  readonly items: MenuItem[] = [
    {
      label: 'Editar perfil',
      icon: 'pi pi-user-edit',
      command: () => this.router.navigate(['/perfil']),
    },
    { separator: true },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      linkClass: 'group text-red-500 hover:bg-red-600 hover:text-white',
      iconClass: 'text-red-500 group-hover:text-white',
      command: () => this.handleLogout(),
    },
  ];

  async handleLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}

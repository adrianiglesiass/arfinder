import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ProfileService } from '@core/profile/profile.service';

@Component({
  selector: 'app-mobile-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.html',
})
export class MobileNav {
  private readonly profileService = inject(ProfileService);
  avatarUrl = this.profileService.profilePhotoUrl;

  navItems = [
    { label: 'Explorar', icon: 'pi pi-search', link: '/explore' },
    { label: 'Mensajes', icon: 'pi pi-envelope', link: '/mensajes' },
  ];
}

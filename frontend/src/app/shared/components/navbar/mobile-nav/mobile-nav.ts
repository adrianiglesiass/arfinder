import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NavbarUserMenu } from '@shared/components/navbar/navbar-user-menu/navbar-user-menu';

@Component({
  selector: 'app-mobile-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive, NavbarUserMenu],
  templateUrl: './mobile-nav.html',
})
export class MobileNav {
  navItems = [
    { label: 'Explorar', icon: 'pi pi-search', link: '/explore' },
    { label: 'Mensajes', icon: 'pi pi-envelope', link: '/mensajes' },
  ];
}

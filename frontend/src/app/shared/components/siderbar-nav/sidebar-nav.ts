import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';

// import { NavbarUserMenu } from '@shared/components/navbar/navbar-user-menu/navbar-user-menu';

import { SidebarUserItem } from './sidebar-user-item/sidebar-user-item';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, ArfinderLogo, SidebarUserItem],
  templateUrl: './sidebar-nav.html',
})
export class SidebarNav {
  readonly items: NavItem[] = [
    { label: 'Explorar', icon: 'pi pi-search', link: '/explore' },
    { label: 'Mensajes', icon: 'pi pi-envelope', link: '/mensajes', badge: '9+' },
  ];
}

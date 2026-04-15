import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-mobile-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-nav.html',
})
export class MobileNav {
  avatarUrl = signal<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
  );

  navItems = [
    { label: 'Explorar', icon: 'pi pi-search', link: '/explore' },
    { label: 'Mensajes', icon: 'pi pi-envelope', link: '/mensajes' },
  ];
}

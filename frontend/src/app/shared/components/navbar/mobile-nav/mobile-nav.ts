import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ConversationStore } from '@core/conversations/conversation.store';

import { NavbarUserMenu } from '@shared/components/navbar/navbar-user-menu/navbar-user-menu';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  badge?: () => string | null;
}

@Component({
  selector: 'app-mobile-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive, NavbarUserMenu],
  templateUrl: './mobile-nav.html',
})
export class MobileNav {
  private readonly store = inject(ConversationStore);

  readonly unreadBadge = computed(() => {
    const total = this.store.totalUnread();
    if (total <= 0) return null;
    return total > 99 ? '99+' : String(total);
  });

  readonly navItems: NavItem[] = [
    { label: 'Explorar', icon: 'pi pi-search', link: '/explorar' },
    {
      label: 'Mensajes',
      icon: 'pi pi-envelope',
      link: '/mensajes',
      badge: () => this.unreadBadge(),
    },
  ];
}

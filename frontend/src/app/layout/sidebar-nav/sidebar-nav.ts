import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { ConversationStore } from '@core/conversations/conversation.store';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';
import { NavBadge } from '@shared/components/nav-badge/nav-badge';

import { SidebarUserItem } from './sidebar-user-item/sidebar-user-item';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  badge?: () => string | null;
  requiresAuth?: boolean;
}

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, ArfinderLogo, SidebarUserItem, NavBadge],
  templateUrl: './sidebar-nav.html',
})
export class SidebarNav {
  private readonly store = inject(ConversationStore);
  private readonly authService = inject(AuthService);

  readonly unreadBadge = computed(() => {
    const total = this.store.totalUnread();
    if (total <= 0) return null;
    return total > 99 ? '99+' : String(total);
  });

  readonly isLoggedIn = computed(() => !!this.authService.currentUser());

  readonly items: NavItem[] = [
    { label: 'Explorar', icon: 'pi pi-search', link: '/explorar' },
    {
      label: 'Mensajes',
      icon: 'pi pi-envelope',
      link: '/mensajes',
      badge: () => this.unreadBadge(),
      requiresAuth: true,
    },
  ];

  readonly visibleItems = computed(() => this.items);
}

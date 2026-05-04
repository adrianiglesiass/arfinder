import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MobileNav } from '@shared/components/navbar/mobile-nav/mobile-nav';
import { SidebarNav } from '@shared/components/siderbar-nav/sidebar-nav';

import { RightPanelService } from './right-panel.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarNav, MobileNav, NgTemplateOutlet],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly rightPanel = inject(RightPanelService);
}

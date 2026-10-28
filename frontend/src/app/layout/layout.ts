import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MobileNav } from '@layout/navbar/mobile-nav/mobile-nav';
import { SidebarNav } from '@layout/sidebar-nav/sidebar-nav';
import { TermsReconsentDialog } from '@layout/terms-reconsent-dialog/terms-reconsent-dialog';

import { RightPanelService } from './right-panel.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarNav, MobileNav, NgTemplateOutlet, TermsReconsentDialog],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly rightPanel = inject(RightPanelService);
}

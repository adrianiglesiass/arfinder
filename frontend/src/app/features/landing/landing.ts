import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ROUTES } from '@core/constants/routes';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';
import { Button } from '@shared/components/button/button';
import { LegalLinks } from '@shared/components/legal-links/legal-links';
import { PageBackground } from '@shared/components/page-background/page-background';

@Component({
  selector: 'app-landing',
  imports: [ArfinderLogo, Button, LegalLinks, PageBackground],
  templateUrl: './landing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Landing {
  private readonly router = inject(Router);

  protected readonly routes = ROUTES;

  protected goTo(route: string): void {
    void this.router.navigateByUrl(route);
  }
}

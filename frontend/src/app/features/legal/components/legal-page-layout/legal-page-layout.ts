import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { LEGAL_INFO } from '@core/constants/legal-info';
import { ROUTES } from '@core/constants/routes';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';
import { BackLink } from '@shared/components/back-link/back-link';
import { LegalLinks } from '@shared/components/legal-links/legal-links';

@Component({
  selector: 'app-legal-page-layout',
  imports: [ArfinderLogo, BackLink, LegalLinks],
  templateUrl: './legal-page-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPageLayout {
  readonly title = input.required<string>();
  readonly lastUpdated = input(LEGAL_INFO.lastUpdated);
  readonly version = input(LEGAL_INFO.version);

  protected readonly homeLink = ROUTES.ROOT;

  protected readonly formattedLastUpdated = computed(() =>
    new Date(this.lastUpdated()).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  );
}

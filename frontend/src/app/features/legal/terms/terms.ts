import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LEGAL_INFO } from '@core/constants/legal-info';
import { ROUTES } from '@core/constants/routes';

import { LegalPageLayout } from '@features/legal/components/legal-page-layout/legal-page-layout';

@Component({
  selector: 'app-terms',
  imports: [RouterLink, LegalPageLayout],
  templateUrl: './terms.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Terms {
  protected readonly legal = LEGAL_INFO;
  protected readonly routes = ROUTES;
}

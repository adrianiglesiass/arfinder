import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ROUTES } from '@core/constants/routes';

export interface LegalLink {
  readonly label: string;
  readonly link: string;
}

export const LEGAL_LINKS: readonly LegalLink[] = [
  { label: 'Privacidad', link: ROUTES.PRIVACY },
  { label: 'Términos', link: ROUTES.TERMS },
  { label: 'Cookies', link: ROUTES.COOKIES },
  { label: 'Aviso legal', link: ROUTES.LEGAL_NOTICE },
];

@Component({
  selector: 'app-legal-links',
  imports: [RouterLink],
  templateUrl: './legal-links.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalLinks {
  protected readonly links = LEGAL_LINKS;
}

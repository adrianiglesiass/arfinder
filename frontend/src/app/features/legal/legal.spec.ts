import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Route } from '@angular/router';

import { routes } from '@app/app.routes';

import { LEGAL_INFO } from '@core/constants/legal-info';
import { ROUTES } from '@core/constants/routes';

import LegalNotice from './legal-notice/legal-notice';
import Privacy from './privacy/privacy';

const LEGAL_PATHS = [ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.COOKIES, ROUTES.LEGAL_NOTICE].map(
  (path) => path.slice(1)
);

function findTopLevelRoute(path: string): Route | undefined {
  return routes.find((route) => route.path === path);
}

describe('Legal routes', () => {
  it.each(LEGAL_PATHS)('registers "%s" as a public, lazy top-level route', async (path) => {
    const route = findTopLevelRoute(path);

    expect(route).toBeDefined();
    expect(route?.canActivate).toBeUndefined();
    expect(route?.canMatch).toBeUndefined();
    expect(route?.loadComponent).toBeTypeOf('function');

    const component = await route?.loadComponent?.();
    expect(component).toBeTruthy();
  });

  it('declares legal routes before the wildcard redirect', () => {
    const wildcardIndex = routes.findIndex((route) => route.path === '**');

    for (const path of LEGAL_PATHS) {
      const index = routes.findIndex((route) => route.path === path);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(wildcardIndex);
    }
  });
});

describe('Legal pages', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacy, LegalNotice],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const pages: [string, Type<unknown>][] = [
    ['Privacy', Privacy],
    ['LegalNotice', LegalNotice],
  ];

  it.each(pages)('%s renders controller info and last updated date', async (_, page) => {
    const fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const controller = element.querySelector('[data-testid="controller-info"]');

    expect(controller?.textContent).toContain(LEGAL_INFO.controller.name);
    expect(controller?.textContent).toContain(LEGAL_INFO.controller.taxId);
    expect(controller?.textContent).toContain(LEGAL_INFO.contactEmail);
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(LEGAL_INFO.lastUpdated);
    // Formatted the same way legal-page-layout does, so the assertion tracks lastUpdated.
    const formattedLastUpdated = new Date(LEGAL_INFO.lastUpdated).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    expect(element.textContent).toContain(formattedLastUpdated);
  });
});

import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';

import { EMPTY } from 'rxjs';
import { vi } from 'vitest';

import { MobileActionBarState } from '@core/layout/mobile-action-bar.state';

import { PwaBanner } from './pwa-banner';

describe('PwaBanner', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const render = async (withActionBar: boolean) => {
    await TestBed.configureTestingModule({
      imports: [PwaBanner],
      providers: [{ provide: SwUpdate, useValue: { isEnabled: false, versionUpdates: EMPTY } }],
    }).compileComponents();

    if (withActionBar) TestBed.inject(MobileActionBarState).register();
    const fixture = TestBed.createComponent(PwaBanner);
    (
      fixture.componentInstance as unknown as { showInstall: { set: (v: boolean) => void } }
    ).showInstall.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('div') as HTMLElement;
  };

  it('se coloca encima de la barra de acciones cuando hay una montada', async () => {
    const banner = await render(true);
    expect(banner.classList).toContain('bottom-39');
    expect(banner.classList).not.toContain('bottom-24');
  });

  it('mantiene su posición cuando no hay barra de acciones', async () => {
    const banner = await render(false);
    expect(banner.classList).toContain('bottom-24');
    expect(banner.classList).not.toContain('bottom-39');
  });
});

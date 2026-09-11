import { TestBed } from '@angular/core/testing';

import { MobileActionBarState } from './mobile-action-bar.state';

describe('MobileActionBarState', () => {
  it('es visible mientras haya alguna barra montada', () => {
    const state = TestBed.inject(MobileActionBarState);
    expect(state.isVisible()).toBe(false);

    state.register();
    state.register();
    state.unregister();
    expect(state.isVisible()).toBe(true);

    state.unregister();
    expect(state.isVisible()).toBe(false);
  });

  it('no baja de cero si se da de baja de más', () => {
    const state = TestBed.inject(MobileActionBarState);
    state.unregister();
    state.register();
    expect(state.isVisible()).toBe(true);
  });
});

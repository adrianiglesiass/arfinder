import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InsForgeClient } from '@insforge/sdk';

import { Layout } from '@core/layout/layout';

const insForgeClientStub = {
  auth: {
    getCurrentUser: async () => ({ data: { user: null } }),
    refreshSession: async () => ({ data: { accessToken: null } }),
    signInWithOAuth: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    verifyEmail: async () => ({ data: null, error: null }),
    resendVerificationEmail: async () => ({ error: null }),
    signOut: async () => undefined,
  },
  getHttpClient: () => ({ getHeaders: () => ({}) }),
};

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [provideRouter([]), { provide: InsForgeClient, useValue: insForgeClientStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InsForgeClient } from '@insforge/sdk';

import { Navbar } from './navbar';

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

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([]), { provide: InsForgeClient, useValue: insForgeClientStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '@env/environment';
import { AuthApiService } from '@infrastructure/api/auth/auth.api.service';
import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { InsForgeClient } from '@insforge/sdk';
import { CreateUserResponse, VerifyEmailResponse } from '@insforge/shared-schemas';

import type { UserResponse } from '@core/api/api.models';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly onboardingPersistence = inject(OnboardingPersistenceService);
  private readonly insforge = inject(InsForgeClient);
  private readonly router = inject(Router);

  currentUser = signal<UserResponse | null>(null);
  private sdkReadyPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.sdkReadyPromise) {
      return this.sdkReadyPromise;
    }

    this.sdkReadyPromise = (async () => {
      try {
        const { data } = await this.insforge.auth.getCurrentUser();

        if (data?.user) {
          this.syncUser().then(() => {
            const currentUrl = window.location.pathname;
            if (
              currentUrl.includes('/login') ||
              currentUrl.includes('/register') ||
              currentUrl.includes('/auth/callback')
            ) {
              this.navigatePostAuth();
            }
          });
        }
      } catch (error) {
        console.error('Auth initialization failed', error);
      }
    })();

    return this.sdkReadyPromise;
  }

  async getToken(): Promise<string | null> {
    if (this.sdkReadyPromise) {
      await this.sdkReadyPromise;
    }

    const headers = this.insforge.getHttpClient().getHeaders();
    const authHeader = headers['Authorization'] || headers['authorization'];
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    try {
      const { data } = await this.insforge.auth.refreshSession();
      return data?.accessToken ?? null;
    } catch {
      return null;
    }
  }

  async loginWithGoogle(): Promise<void> {
    const { error } = await this.insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: environment.insforge.redirectUri,
    });
    if (error) throw error;
  }

  async login(credentials: { email: string; password: string }): Promise<void> {
    const { data, error } = await this.insforge.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (data) {
      await this.syncUser();
    }
  }

  async register(credentials: {
    email: string;
    password: string;
  }): Promise<CreateUserResponse | null> {
    const { data, error } = await this.insforge.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
    if (data) {
      if (!data.requireEmailVerification) {
        await this.syncUser();
      }
    }
    return data;
  }

  async verifyEmail(email: string, otp: string): Promise<VerifyEmailResponse | null> {
    const { data, error } = await this.insforge.auth.verifyEmail({
      email,
      otp,
    });

    if (error) throw error;

    if (data) {
      await this.syncUser();
    }
    return data;
  }

  async navigatePostAuth(): Promise<void> {
    const hasProfile = await this.hasProfile();
    await this.router.navigate([hasProfile ? '' : '/onboarding']);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await this.insforge.auth.resendVerificationEmail({
      email,
    });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    await this.insforge.auth.signOut();
    this.currentUser.set(null);
    this.onboardingPersistence.clearAll();
  }

  async isAuthenticated(): Promise<boolean> {
    await this.init();
    const { data } = await this.insforge.auth.getCurrentUser();
    return !!data?.user;
  }

  private async syncUser(): Promise<void> {
    try {
      const user = await this.authApi.getMe();
      this.currentUser.set(user);
      this.onboardingPersistence.ensureUser(user.id);
    } catch {
      this.currentUser.set(null);
      this.onboardingPersistence.clearAll();
    }
  }

  private async hasProfile(): Promise<boolean> {
    try {
      await this.profileApi.getMyProfile();
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return false;
      }
      throw error;
    }
  }
}

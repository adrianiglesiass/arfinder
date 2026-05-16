import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '@env/environment';
import { AuthApiService } from '@infrastructure/api/auth/auth.api.service';
import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { InsForgeClient } from '@insforge/sdk';
import { CreateUserResponse, VerifyEmailResponse } from '@insforge/shared-schemas';

import type { UserResponse } from '@core/api/api.models';
import { ROUTES } from '@core/constants/routes';
import { STORAGE_KEYS } from '@core/constants/storage-keys';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';

interface InsForgeInternal {
  tokenManager: {
    getAccessToken: () => string | null;
  };
}

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
  private invalidatePromise: Promise<void> | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private readonly PUBLIC_PATHS = [
    ROUTES.LOGIN,
    ROUTES.REGISTER,
    ROUTES.VERIFY_EMAIL,
    ROUTES.AUTH_CALLBACK,
  ];
  private readonly REFRESH_TOKEN_KEY = STORAGE_KEYS.auth.refreshToken;
  private readonly ACCESS_TOKEN_KEY = STORAGE_KEYS.auth.accessToken;

  init(): Promise<void> {
    if (this.sdkReadyPromise) return this.sdkReadyPromise;
    this.sdkReadyPromise = this.bootstrapSession();
    return this.sdkReadyPromise;
  }

  private async bootstrapSession(): Promise<void> {
    try {
      if (!this.getPersistedRefreshToken()) {
        this.currentUser.set(null);
        return;
      }

      const accessToken = await this.forceRefreshToken();
      if (!accessToken) {
        this.currentUser.set(null);
        return;
      }

      await this.syncUser();
    } catch {
      this.currentUser.set(null);
    }
  }

  async handleOAuthCallback(code: string): Promise<void> {
    const { data, error } = await this.insforge.auth.exchangeOAuthCode(code);
    if (error) throw error;
    if (data?.accessToken) {
      this.persistAccessToken(data.accessToken);
    }
    if (data?.refreshToken) {
      this.persistRefreshToken(data.refreshToken);
    }
    if (data?.accessToken) {
      await this.syncUser();
    }
    this.sdkReadyPromise = Promise.resolve();
  }

  private persistRefreshToken(token: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  private getPersistedRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private clearPersistedRefreshToken(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private persistAccessToken(token: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  private getPersistedAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  private clearPersistedAccessToken(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }

  private isAccessTokenFresh(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return typeof payload.exp === 'number' && payload.exp - now > 30;
    } catch {
      return false;
    }
  }

  invalidateSession(): Promise<void> {
    if (this.invalidatePromise) return this.invalidatePromise;

    this.invalidatePromise = (async () => {
      try {
        await this.logout();
        if (!this.PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p))) {
          await this.router.navigate([ROUTES.LOGIN]);
        }
      } finally {
        setTimeout(() => {
          this.invalidatePromise = null;
        }, 0);
      }
    })();

    return this.invalidatePromise;
  }

  async getToken(): Promise<string | null> {
    const internal = this.insforge as unknown as InsForgeInternal;
    const sdkCached = internal?.tokenManager?.getAccessToken?.();
    if (sdkCached && this.isAccessTokenFresh(sdkCached)) return sdkCached;

    const persistedAccess = this.getPersistedAccessToken();
    if (persistedAccess && this.isAccessTokenFresh(persistedAccess)) {
      return persistedAccess;
    }

    return this.forceRefreshToken();
  }

  async forceRefreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const persisted = this.getPersistedRefreshToken();
        if (!persisted) return null;
        const { data, error } = await this.insforge.auth.refreshSession({
          refreshToken: persisted,
        });
        if (error) {
          this.clearPersistedRefreshToken();
          this.clearPersistedAccessToken();
          return null;
        }
        if (data?.accessToken) {
          this.persistAccessToken(data.accessToken);
        }
        if (data?.refreshToken) {
          this.persistRefreshToken(data.refreshToken);
        }
        return data?.accessToken ?? null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async loginWithGoogle(): Promise<void> {
    const { data, error } = await this.insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: environment.insforge.redirectUri,
      skipBrowserRedirect: true,
    });
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  async loginWithApple(): Promise<void> {
    const { data, error } = await this.insforge.auth.signInWithOAuth({
      provider: 'apple',
      redirectTo: environment.insforge.redirectUri,
      skipBrowserRedirect: true,
    });
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  async login(credentials: { email: string; password: string }): Promise<void> {
    const { data, error } = await this.insforge.auth.signInWithPassword(credentials);
    if (error) throw error;

    if (data?.accessToken) {
      this.persistAccessToken(data.accessToken);
      if (data.refreshToken) this.persistRefreshToken(data.refreshToken);
      await this.syncUser();
    }
  }

  async register(credentials: {
    email: string;
    password: string;
  }): Promise<CreateUserResponse | null> {
    const { data, error } = await this.insforge.auth.signUp(credentials);
    if (error) throw error;

    if (data && !data.requireEmailVerification && data.accessToken) {
      this.persistAccessToken(data.accessToken);
      if (data.refreshToken) this.persistRefreshToken(data.refreshToken);
      await this.syncUser();
    }
    return data;
  }

  async verifyEmail(email: string, otp: string): Promise<VerifyEmailResponse | null> {
    const { data, error } = await this.insforge.auth.verifyEmail({ email, otp });
    if (error) throw error;

    if (data?.accessToken) {
      this.persistAccessToken(data.accessToken);
      if (data.refreshToken) this.persistRefreshToken(data.refreshToken);
      await this.syncUser();
    }
    return data;
  }

  async navigatePostAuth(): Promise<void> {
    try {
      const hasProfile = await this.hasProfile();
      await this.router.navigate([hasProfile ? '' : ROUTES.WELCOME]);
    } catch {
      // authErrorInterceptor already redirects on 401; swallow to avoid Uncaught
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    interface ResendableInsForgeClient {
      auth?: {
        resendVerification?: (args: { email: string }) => Promise<{ error?: unknown }>;
        sendVerificationEmail?: (args: { email: string }) => Promise<{ error?: unknown }>;
      };
      getHttpClient?: () => { post: (path: string, body: unknown) => Promise<unknown> };
    }

    const client = this.insforge as unknown as ResendableInsForgeClient;

    if (client?.auth?.resendVerification) {
      const { error } = await client.auth.resendVerification({ email });
      if (error) throw error;
      return;
    }

    if (client?.auth?.sendVerificationEmail) {
      const { error } = await client.auth.sendVerificationEmail({ email });
      if (error) throw error;
      return;
    }

    if (client?.getHttpClient) {
      try {
        const http = client.getHttpClient();
        await http.post('/auth/send-verification', { email });
        return;
      } catch {
        /* empty */
      }
    }

    throw new Error('Unable to resend verification email: SDK does not expose a resend method');
  }

  async logout(): Promise<void> {
    try {
      await this.insforge.auth.signOut();
    } catch {
      /* empty */
    }
    this.clearSession();
  }

  async deleteAccount(): Promise<void> {
    await this.authApi.deleteAccount();
    this.clearSession();
  }

  private clearSession(): void {
    this.clearPersistedRefreshToken();
    this.clearPersistedAccessToken();
    this.currentUser.set(null);
    this.onboardingPersistence.clearAll();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.profile.byId);
      sessionStorage.removeItem(STORAGE_KEYS.profile.me);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    await this.init();
    return this.currentUser() !== null;
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
      if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 401)) {
        return false;
      }
      throw error;
    }
  }
}

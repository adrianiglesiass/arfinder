import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '@env/environment';
import { AuthApiService } from '@infrastructure/api/auth/auth.api.service';
import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { type AuthSession, InsForgeClient } from '@insforge/sdk';
import { CreateUserResponse, VerifyEmailResponse } from '@insforge/shared-schemas';

import type { UserResponse } from '@core/api/api.models';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';

interface InsForgeInternal {
  tokenManager: {
    saveSession: (session: AuthSession) => void;
    clearSession: () => void;
    getAccessToken: () => string | null;
  };
  http?: {
    setAuthToken: (token: string | null) => void;
    setRefreshToken: (token: string | null) => void;
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
  private readonly SDK_SESSION_KEY = 'insforge_saved_session';
  private readonly PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/auth/callback'];

  private saveSdkSessionToStorage(session: { accessToken?: string; user?: unknown } | null) {
    try {
      if (!session) {
        sessionStorage.removeItem(this.SDK_SESSION_KEY);
        return;
      }
      sessionStorage.setItem(this.SDK_SESSION_KEY, JSON.stringify(session));
    } catch {
      /* empty */
    }
  }

  private loadSdkSessionFromStorage(): { accessToken?: string; user?: unknown } | null {
    try {
      const raw = sessionStorage.getItem(this.SDK_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { accessToken?: string; user?: unknown };
    } catch {
      return null;
    }
  }

  private static readonly INIT_SYNC_TIMEOUT_MS = 2000;

  init(): Promise<void> {
    if (this.sdkReadyPromise) return this.sdkReadyPromise;

    this.restoreSdkSessionSync();

    this.sdkReadyPromise = Promise.race([
      this.backgroundSync(),
      new Promise<void>((resolve) => setTimeout(resolve, AuthService.INIT_SYNC_TIMEOUT_MS)),
    ]);

    return this.sdkReadyPromise;
  }

  private restoreSdkSessionSync(): void {
    try {
      const saved = this.loadSdkSessionFromStorage();
      if (!saved?.accessToken) return;
      const internal = this.insforge as unknown as InsForgeInternal;
      internal?.tokenManager?.saveSession?.({
        accessToken: saved.accessToken,
        user: saved.user as AuthSession['user'],
      });

      internal?.http?.setAuthToken?.(saved.accessToken);
    } catch {
      /* empty */
    }
  }

  private async backgroundSync(): Promise<void> {
    const hadLocalToken = !!(
      this.loadSdkSessionFromStorage()?.accessToken ||
      (this.insforge as unknown as InsForgeInternal)?.tokenManager?.getAccessToken?.()
    );

    try {
      const { data, error } = await this.insforge.auth.getCurrentUser();

      if (error || !data?.user) {
        const sessionInvalid =
          error?.statusCode === 401 || error?.statusCode === 403 || (!error && !data?.user);
        if (sessionInvalid) {
          if (hadLocalToken) await this.invalidateSession();
          return;
        }
        if (hadLocalToken) await this.syncUser();
        return;
      }

      await this.syncUser();

      if (this.PUBLIC_PATHS.some((p) => window.location.pathname.includes(p))) {
        this.navigatePostAuth();
      }
    } catch {
      if (hadLocalToken) await this.syncUser();
    }
  }

  invalidateSession(): Promise<void> {
    if (this.invalidatePromise) return this.invalidatePromise;

    this.invalidatePromise = (async () => {
      try {
        await this.logout();
        if (!this.PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p))) {
          await this.router.navigate(['/login']);
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
    if (!this.sdkReadyPromise) this.restoreSdkSessionSync();

    try {
      const internal = this.insforge as unknown as InsForgeInternal;
      const userToken = internal?.tokenManager?.getAccessToken?.();
      if (userToken) return userToken;
    } catch {
      /* empty */
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

    if (data?.accessToken) {
      this.saveSdkSessionToStorage({ accessToken: data.accessToken, user: data.user });
      await this.syncUser();
    }
  }

  async register(credentials: {
    email: string;
    password: string;
  }): Promise<CreateUserResponse | null> {
    const { data, error } = await this.insforge.auth.signUp(credentials);
    if (error) throw error;

    if (data) {
      if (!data.requireEmailVerification && data.accessToken) {
        this.saveSdkSessionToStorage({ accessToken: data.accessToken, user: data.user });
        await this.syncUser();
      }
    }
    return data;
  }

  async verifyEmail(email: string, otp: string): Promise<VerifyEmailResponse | null> {
    const { data, error } = await this.insforge.auth.verifyEmail({ email, otp });
    if (error) throw error;

    if (data?.accessToken) {
      this.saveSdkSessionToStorage({ accessToken: data.accessToken, user: data.user });
      await this.syncUser();
    }
    return data;
  }

  async navigatePostAuth(): Promise<void> {
    const hasProfile = await this.hasProfile();
    await this.router.navigate([hasProfile ? '' : '/onboarding']);
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
    this.currentUser.set(null);
    this.onboardingPersistence.clearAll();
    this.saveSdkSessionToStorage(null);
  }

  async isAuthenticated(): Promise<boolean> {
    await this.init();

    try {
      const internal = this.insforge as unknown as InsForgeInternal;
      if (internal?.tokenManager?.getAccessToken?.()) return true;
    } catch {
      /* empty */
    }

    try {
      const { data } = await this.insforge.auth.getCurrentUser();
      return !!data?.user;
    } catch {
      return false;
    }
  }

  private async syncUser(): Promise<void> {
    try {
      const user = await this.authApi.getMe();
      this.currentUser.set(user);
      this.onboardingPersistence.ensureUser(user.id);

      const token = await this.getToken();
      if (token) {
        const internal = this.insforge as unknown as InsForgeInternal;
        internal.tokenManager.saveSession({
          accessToken: token,
          user: user as unknown as AuthSession['user'],
        });

        this.saveSdkSessionToStorage({ accessToken: token, user });
      }
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

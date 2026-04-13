import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '@env/environment';
import { InsForgeClient } from '@insforge/sdk';
import { firstValueFrom } from 'rxjs';

import type { UserResponse } from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly insforge = inject(InsForgeClient);
  private readonly router = inject(Router);

  currentUser = signal<UserResponse | null>(null);

  async init(): Promise<void> {
    const { data } = await this.insforge.auth.getCurrentUser();

    if (data?.user) {
      await this.syncUser();

      const currentUrl = window.location.pathname;
      if (
        currentUrl.includes('/login') ||
        currentUrl.includes('/register') ||
        currentUrl.includes('/auth/callback')
      ) {
        await this.router.navigate(['/']);
      }
    }
  }

  async getToken(): Promise<string | null> {
    const headers = this.insforge.getHttpClient().getHeaders();
    const authHeader = headers['Authorization'] || headers['authorization'];
    return authHeader ? authHeader.replace('Bearer ', '') : null;
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

  async register(credentials: { email: string; password: string }): Promise<void> {
    const { data, error } = await this.insforge.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
    if (data) {
      await this.syncUser();
    }
  }

  async logout(): Promise<void> {
    await this.insforge.auth.signOut();
    this.currentUser.set(null);
  }

  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.insforge.auth.getCurrentUser();
    return !!data?.user;
  }

  private async syncUser(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<UserResponse>(`${environment.APIURL}/auth/me`)
      );
      this.currentUser.set(user);
    } catch (error) {
      console.error('Failed to sync user with backend:', error);
      this.currentUser.set(null);
    }
  }
}

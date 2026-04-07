import { inject, Injectable, signal } from '@angular/core';

import { AuthApiService } from '@infrastructure/api/auth/auth.api.service';

import type { UserCreate, UserResponse } from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly authApi = inject(AuthApiService);

  currentUser = signal<UserResponse | null>(null);

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  async login(credentials: UserCreate): Promise<void> {
    const response = await this.authApi.login(credentials);
    this.setToken(response.access_token);
  }

  async register(credentials: UserCreate): Promise<UserResponse> {
    return await this.authApi.register(credentials);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        this.logout();
        return false;
      }

      return true;
    } catch {
      this.logout();
      return false;
    }
  }
}

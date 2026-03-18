import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserCreate, UserResponse, Token } from '@core/models/auth-model';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/auth`;

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  login(credentials: UserCreate): Observable<Token> {
    return this.http.post<Token>(`${this.APIURL}/login`, credentials);
  }

  register(credentials: UserCreate): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.APIURL}/register`, credentials);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

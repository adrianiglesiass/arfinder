// src/app/infrastructure/api/auth.api.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { Token, UserCreate, UserResponse } from '@core/api/api.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/auth`;

  async login(credentials: UserCreate): Promise<Token> {
    return firstValueFrom(this.http.post<Token>(`${this.APIURL}/login`, credentials));
  }

  async register(credentials: UserCreate): Promise<UserResponse> {
    return firstValueFrom(this.http.post<UserResponse>(`${this.APIURL}/register`, credentials));
  }
}

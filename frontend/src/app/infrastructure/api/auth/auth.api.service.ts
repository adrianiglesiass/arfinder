import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ConsentCreate, UserResponse } from '@core/api/api.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/auth`;

  async getMe(): Promise<UserResponse> {
    return firstValueFrom(this.http.get<UserResponse>(`${this.APIURL}/me`));
  }

  async acceptTerms(termsVersion: string): Promise<UserResponse> {
    const body: ConsentCreate = { terms_version: termsVersion, is_adult: true };
    return firstValueFrom(this.http.post<UserResponse>(`${this.APIURL}/me/consent`, body));
  }

  async exportMyData(): Promise<Blob> {
    return firstValueFrom(this.http.get(`${this.APIURL}/me/export`, { responseType: 'blob' }));
  }

  async deleteAccount(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.APIURL}/me`));
  }
}

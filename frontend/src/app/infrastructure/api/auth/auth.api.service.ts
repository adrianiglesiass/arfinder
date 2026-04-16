import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { UserResponse } from '@core/api/api.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/auth`;

  async getMe(): Promise<UserResponse> {
    return firstValueFrom(this.http.get<UserResponse>(`${this.APIURL}/me`));
  }
}

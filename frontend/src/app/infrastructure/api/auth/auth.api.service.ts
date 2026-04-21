import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  CreateUserRequest,
  CreateUserResponse,
  SendVerificationEmailRequest,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '@insforge/shared-schemas';
import { firstValueFrom } from 'rxjs';

import type { UserResponse } from '@core/api/api.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/auth`;

  async getMe(): Promise<UserResponse> {
    return firstValueFrom(this.http.get<UserResponse>(`${this.APIURL}/me`));
  }

  async proxyLogin(data: CreateSessionRequest): Promise<CreateSessionResponse> {
    return firstValueFrom(
      this.http.post<CreateSessionResponse>(`${this.APIURL}/proxy/login`, data)
    );
  }

  async proxyRegister(data: CreateUserRequest): Promise<CreateUserResponse> {
    return firstValueFrom(
      this.http.post<CreateUserResponse>(`${this.APIURL}/proxy/register`, data)
    );
  }

  async proxyVerifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    return firstValueFrom(
      this.http.post<VerifyEmailResponse>(`${this.APIURL}/proxy/verify-email`, data)
    );
  }

  async proxyResendVerification(data: SendVerificationEmailRequest): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.post<{ status: string }>(`${this.APIURL}/proxy/resend-verification`, data)
    );
  }
}

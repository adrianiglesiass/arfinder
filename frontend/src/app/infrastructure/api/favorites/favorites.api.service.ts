import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ProfileSummary } from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class FavoritesApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/profiles`;

  getMyFavorites(): Promise<ProfileSummary[]> {
    return firstValueFrom(this.http.get<ProfileSummary[]>(`${this.APIURL}/me/favorites`));
  }

  favorite(profileId: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.APIURL}/${profileId}/favorite`, null));
  }

  unfavorite(profileId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.APIURL}/${profileId}/favorite`));
  }
}

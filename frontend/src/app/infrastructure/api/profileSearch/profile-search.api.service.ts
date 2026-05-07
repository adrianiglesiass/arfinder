import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ProfileSearchFilters, ProfileSummary } from '@core/api/api.models';

@Injectable({ providedIn: 'root' })
export class ProfileSearchApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/profiles`;

  search(filters: ProfileSearchFilters): Promise<ProfileSummary[]> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters) as [keyof ProfileSearchFilters, unknown][]) {
      if (value === null || value === undefined || value === '') continue;
      params = params.set(key, String(value));
    }

    return firstValueFrom(this.http.get<ProfileSummary[]>(this.APIURL, { params }));
  }
}

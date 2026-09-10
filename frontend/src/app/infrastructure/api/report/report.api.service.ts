import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import type { ReportCreate } from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class ReportApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/profiles`;

  report(profileId: number, payload: ReportCreate): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.APIURL}/${profileId}/report`, payload));
  }
}

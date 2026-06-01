import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { catchError, Observable, of } from 'rxjs';

import { CitySearchResponse } from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class CityApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/cities/search`;

  searchCities(query: string): Observable<string[]> {
    if (!query.trim()) return of([]);

    const params = new HttpParams().set('q', query);

    return this.http.get<CitySearchResponse>(this.APIURL, { params }).pipe(
      catchError((error) => {
        console.error('Error en busqueda de ciudades:', error);
        return of([]);
      })
    );
  }

  searchCitiesExtended(query: string): Observable<string[]> {
    if (!query.trim()) return of([]);

    const params = new HttpParams().set('q', query);

    return this.http.get<CitySearchResponse>(`${this.APIURL}/extended`, { params }).pipe(
      catchError((error) => {
        console.error('Error en busqueda extendida de ciudades:', error);
        return of([]);
      })
    );
  }
}

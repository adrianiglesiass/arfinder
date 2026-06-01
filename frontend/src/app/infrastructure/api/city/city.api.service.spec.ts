import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { CityApiService } from './city.api.service';

describe('CityApiService', () => {
  let service: CityApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CityApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CityApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('searchCities hits the local /cities/search endpoint', () => {
    let result: string[] | undefined;
    service.searchCities('madrid').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.APIURL}/cities/search?q=madrid`);
    expect(req.request.method).toBe('GET');
    req.flush(['Madrid']);

    expect(result).toEqual(['Madrid']);
  });

  it('searchCitiesExtended hits the /cities/search/extended endpoint', () => {
    let result: string[] | undefined;
    service.searchCitiesExtended('cuenca').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.APIURL}/cities/search/extended?q=cuenca`);
    expect(req.request.method).toBe('GET');
    req.flush(['Cuenca']);

    expect(result).toEqual(['Cuenca']);
  });

  it('returns [] without a request for a blank query', () => {
    let result: string[] | undefined;
    service.searchCities('   ').subscribe((r) => (result = r));

    httpMock.expectNone(() => true);
    expect(result).toEqual([]);
  });

  it('swallows errors and returns [] from the extended endpoint', () => {
    let result: string[] | undefined;
    service.searchCitiesExtended('cuenca').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.APIURL}/cities/search/extended?q=cuenca`);
    req.flush('error', { status: 503, statusText: 'Service Unavailable' });

    expect(result).toEqual([]);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { AuthApiService } from './auth.api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('exportMyData requests the export endpoint as a blob', async () => {
    const promise = service.exportMyData();

    const req = httpMock.expectOne(`${environment.APIURL}/auth/me/export`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    const blob = new Blob(['{"user":{}}'], { type: 'application/json' });
    req.flush(blob);

    await expect(promise).resolves.toBe(blob);
  });
});

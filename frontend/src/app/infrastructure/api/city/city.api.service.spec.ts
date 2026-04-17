import { TestBed } from '@angular/core/testing';

import { CityApiService } from './city.api.service';

describe('CityApiService', () => {
  let service: CityApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CityApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

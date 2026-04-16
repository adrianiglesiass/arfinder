import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageService } from 'primeng/api';

import { StepPhotos } from './step-photos';

describe('StepPhotos', () => {
  let component: StepPhotos;
  let fixture: ComponentFixture<StepPhotos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepPhotos],
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(StepPhotos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

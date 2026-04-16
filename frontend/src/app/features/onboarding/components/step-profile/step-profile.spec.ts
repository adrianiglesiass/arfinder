import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepProfile } from './step-profile';

describe('StepProfile', () => {
  let component: StepProfile;
  let fixture: ComponentFixture<StepProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(StepProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

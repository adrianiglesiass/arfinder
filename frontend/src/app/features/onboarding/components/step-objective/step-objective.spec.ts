import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepObjective } from './step-objective';

describe('StepObjective', () => {
  let component: StepObjective;
  let fixture: ComponentFixture<StepObjective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepObjective],
    }).compileComponents();

    fixture = TestBed.createComponent(StepObjective);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'looking_for_flat');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

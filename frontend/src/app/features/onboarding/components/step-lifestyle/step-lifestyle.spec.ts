import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepLifestyle } from './step-lifestyle';

describe('StepLifestyle', () => {
  let component: StepLifestyle;
  let fixture: ComponentFixture<StepLifestyle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepLifestyle],
    }).compileComponents();

    fixture = TestBed.createComponent(StepLifestyle);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('schedule', 'morning');
    fixture.componentRef.setInput('hasPets', false);
    fixture.componentRef.setInput('isSmoker', false);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

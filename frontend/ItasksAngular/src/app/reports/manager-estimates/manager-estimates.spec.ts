import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerEstimates } from './manager-estimates';

describe('ManagerEstimates', () => {
  let component: ManagerEstimates;
  let fixture: ComponentFixture<ManagerEstimates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerEstimates]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerEstimates);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

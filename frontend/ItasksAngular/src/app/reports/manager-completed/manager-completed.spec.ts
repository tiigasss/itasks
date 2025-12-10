import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerCompleted } from './manager-completed';

describe('ManagerCompleted', () => {
  let component: ManagerCompleted;
  let fixture: ComponentFixture<ManagerCompleted>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerCompleted]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerCompleted);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

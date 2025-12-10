import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerPending } from './manager-pending';

describe('ManagerPending', () => {
  let component: ManagerPending;
  let fixture: ComponentFixture<ManagerPending>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerPending]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerPending);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

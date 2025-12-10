import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgrammerCompleted } from './programmer-completed';

describe('ProgrammerCompleted', () => {
  let component: ProgrammerCompleted;
  let fixture: ComponentFixture<ProgrammerCompleted>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgrammerCompleted]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgrammerCompleted);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

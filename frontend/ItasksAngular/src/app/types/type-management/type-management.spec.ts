import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeManagement } from './type-management';

describe('TypeManagement', () => {
  let component: TypeManagement;
  let fixture: ComponentFixture<TypeManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

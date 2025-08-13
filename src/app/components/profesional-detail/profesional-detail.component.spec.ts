import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfesionalDetailComponent } from './profesional-detail.component';

describe('ProfesionalDetailComponent', () => {
  let component: ProfesionalDetailComponent;
  let fixture: ComponentFixture<ProfesionalDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfesionalDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfesionalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExplorerprofesionalsComponent } from './explorerprofesionals.component';

describe('ExplorerprofesionalsComponent', () => {
  let component: ExplorerprofesionalsComponent;
  let fixture: ComponentFixture<ExplorerprofesionalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplorerprofesionalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExplorerprofesionalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

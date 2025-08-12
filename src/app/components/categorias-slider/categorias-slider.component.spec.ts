import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriasSliderComponent } from './categorias-slider.component';

describe('CategoriasSliderComponent', () => {
  let component: CategoriasSliderComponent;
  let fixture: ComponentFixture<CategoriasSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriasSliderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoriasSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

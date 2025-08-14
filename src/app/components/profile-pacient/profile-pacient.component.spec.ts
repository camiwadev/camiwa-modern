import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePacientComponent } from './profile-pacient.component';

describe('ProfilePacientComponent', () => {
  let component: ProfilePacientComponent;
  let fixture: ComponentFixture<ProfilePacientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePacientComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilePacientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-patient-profile',
  standalone:true,
  imports: [CommonModule],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.css'
})
export class PatientProfileComponent {
constructor (
  public global:GlobalService
){}
}

import { Component } from '@angular/core';
import { GlobalService } from '../../../services/global.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone:true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
constructor(
  public global:GlobalService
){}
}

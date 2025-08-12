import { Component } from '@angular/core';
import { GlobalService } from '../../../services/global.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
constructor(
  public global: GlobalService
){
  
}
}
